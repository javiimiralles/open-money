/**
 * Portfolio valuation math (US-011).
 *
 * Pure functions over an average-cost position and its last known price.
 * Unknown prices stay unknown: value and P&L are null instead of falling
 * back to the invested cost.
 */

import { convertToEur } from './currency';

export interface PortfolioValuationInput {
  quantity: number;
  invested: number;
  lastPrice: number | null;
  currency: string;
}

export interface PortfolioValues {
  hasPosition: boolean;
  hasPrice: boolean;
  investedEur: number;
  valueEur: number | null;
  pnlEur: number | null;
  pnlPct: number | null;
  rateMissing: boolean;
}

export function computePortfolioValues(
  input: PortfolioValuationInput,
  rates: Record<string, number>,
): PortfolioValues {
  const hasPosition = input.quantity > 0;
  const invested = convertToEur(hasPosition ? input.invested : 0, input.currency, rates);
  if (!hasPosition || input.lastPrice === null) {
    return {
      hasPosition,
      hasPrice: false,
      investedEur: invested.amountEur,
      valueEur: null,
      pnlEur: null,
      pnlPct: null,
      rateMissing: invested.rateMissing,
    };
  }
  const value = convertToEur(input.quantity * input.lastPrice, input.currency, rates);
  const pnlEur = value.amountEur - invested.amountEur;
  return {
    hasPosition: true,
    hasPrice: true,
    investedEur: invested.amountEur,
    valueEur: value.amountEur,
    pnlEur,
    pnlPct: invested.amountEur > 0 ? pnlEur / invested.amountEur : null,
    rateMissing: invested.rateMissing || value.rateMissing,
  };
}

export interface PortfolioTotals {
  valuedCount: number;
  unpricedCount: number;
  totalValueEur: number;
  totalInvestedEur: number;
  totalPnlEur: number | null;
  totalPnlPct: number | null;
  rateMissing: boolean;
}

/**
 * Aggregates per-position values. Only positions with a known price feed
 * the totals; unpriced ones are counted so the UI can warn that the total
 * is partial.
 */
export function computePortfolioTotals(items: PortfolioValues[]): PortfolioTotals {
  let valuedCount = 0;
  let unpricedCount = 0;
  let totalValueEur = 0;
  let totalInvestedEur = 0;
  let rateMissing = false;

  for (const item of items) {
    if (!item.hasPosition) {
      continue;
    }
    rateMissing = rateMissing || item.rateMissing;
    if (!item.hasPrice || item.valueEur === null || item.pnlEur === null) {
      unpricedCount += 1;
      continue;
    }
    valuedCount += 1;
    totalValueEur += item.valueEur;
    totalInvestedEur += item.investedEur;
  }

  const totalPnlEur = valuedCount > 0 ? totalValueEur - totalInvestedEur : null;
  return {
    valuedCount,
    unpricedCount,
    totalValueEur,
    totalInvestedEur,
    totalPnlEur,
    totalPnlPct: totalPnlEur !== null && totalInvestedEur > 0 ? totalPnlEur / totalInvestedEur : null,
    rateMissing,
  };
}
