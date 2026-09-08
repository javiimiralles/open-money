/**
 * Pure helpers to group transactions by day and summarize filtered results.
 * Kept free of SQLite so they are trivially unit-testable.
 */

import type { TransactionWithDetails } from '@/db/repositories/transactions-repo';

export interface TransactionDayGroup {
  date: string;
  signedTotal: number;
  /** Currency of the day's total; null when the day mixes currencies. */
  currency: string | null;
  items: TransactionWithDetails[];
}

export interface TransactionSummary {
  count: number;
  net: number;
  /** Currency of the net total; null when mixed or empty. */
  currency: string | null;
  mixedCurrencies: boolean;
}

/**
 * Signed contribution of a transaction to income/expense/investment totals.
 * Transfers are neutral (they move balance between own accounts).
 */
export function signedAmount(transaction: TransactionWithDetails): number {
  if (transaction.type === 'income') {
    return transaction.amount;
  }
  if (transaction.type === 'expense' || transaction.type === 'investment') {
    return -transaction.amount;
  }
  return 0;
}

/**
 * Groups transactions by day (newest day first) with the day's signed total.
 * Input order is preserved within each day.
 */
export function groupByDay(items: TransactionWithDetails[]): TransactionDayGroup[] {
  const groups = new Map<string, TransactionDayGroup>();
  for (const item of items) {
    let group = groups.get(item.date);
    if (!group) {
      group = { date: item.date, signedTotal: 0, currency: null, items: [] };
      groups.set(item.date, group);
    }
    group.signedTotal += signedAmount(item);
    group.items.push(item);
  }
  for (const group of groups.values()) {
    const currencies = new Set(group.items.map((item) => item.currency));
    group.currency = currencies.size === 1 ? [...currencies][0] : null;
  }
  return [...groups.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * Summarizes a filtered transaction list: count, signed net total, and
 * whether multiple currencies are present (totals are naive until US-007).
 */
export function summarizeTransactions(items: TransactionWithDetails[]): TransactionSummary {
  const currencies = new Set(items.map((item) => item.currency));
  const mixedCurrencies = currencies.size > 1;
  return {
    count: items.length,
    net: items.reduce((sum, item) => sum + signedAmount(item), 0),
    currency: mixedCurrencies || currencies.size === 0 ? null : [...currencies][0],
    mixedCurrencies,
  };
}