/**
 * Average-cost position math (US-010).
 *
 * Pure functions over an instrument's trade history: buys add cost, sells
 * remove cost at the running average (the average itself never changes on a
 * sell). Dates are ISO `YYYY-MM-DD` strings, so lexicographic order matches
 * chronological order.
 */

export type PositionTradeType = 'buy' | 'sell';

export interface PositionTrade {
  id?: number;
  date: string;
  type: PositionTradeType;
  quantity: number;
  price: number;
}

export interface PositionSummary {
  /** Units currently held. */
  quantity: number;
  /** Average cost per unit of the held units (0 when nothing is held). */
  avgCost: number;
  /** Residual cost of the held units. */
  invested: number;
  /**
   * First date at which holdings would go negative, or null when the whole
   * history is consistent. Used to validate sells.
   */
  negativeAt: string | null;
}

const EPSILON = 1e-9;

function compareTrades(a: PositionTrade, b: PositionTrade): number {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  // Same-day trades settle buys before sells.
  if (a.type !== b.type) {
    return a.type === 'buy' ? -1 : 1;
  }
  return (a.id ?? 0) - (b.id ?? 0);
}

export function computePosition(trades: PositionTrade[]): PositionSummary {
  const sorted = [...trades].sort(compareTrades);
  let quantity = 0;
  let cost = 0;
  let negativeAt: string | null = null;

  for (const trade of sorted) {
    if (trade.type === 'buy') {
      quantity += trade.quantity;
      cost += trade.quantity * trade.price;
    } else {
      const avg = quantity > 0 ? cost / quantity : 0;
      quantity -= trade.quantity;
      cost -= trade.quantity * avg;
    }
    if (Math.abs(quantity) < EPSILON) {
      quantity = 0;
      cost = 0;
    }
    if (quantity < 0 && negativeAt === null) {
      negativeAt = trade.date;
    }
  }

  return {
    quantity,
    avgCost: quantity > 0 ? cost / quantity : 0,
    invested: quantity > 0 ? cost : 0,
    negativeAt,
  };
}

/**
 * Holdings available right before a prospective sell on the given date:
 * buys minus sells dated on or before it.
 */
export function holdingsAtDate(trades: PositionTrade[], date: string): number {
  let holdings = 0;
  for (const trade of trades) {
    if (trade.date > date) {
      continue;
    }
    holdings += trade.type === 'buy' ? trade.quantity : -trade.quantity;
  }
  return Math.abs(holdings) < EPSILON ? 0 : holdings;
}
