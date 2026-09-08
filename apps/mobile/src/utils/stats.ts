/**
 * Pure statistics helpers: period ranges, EUR consolidation, monthly series,
 * category breakdown, and compact axis formatting.
 * Kept free of SQLite and React so they are trivially unit-testable.
 */

import type {
  CategoryExpenseTotal,
  MonthTypeCurrencyTotal,
  TypeCurrencyTotal,
} from '@/db/repositories/transactions-repo';
import { convertToEur } from './currency';

export type StatsPeriod = 'month' | 'sixMonths' | 'year';

export const STATS_PERIOD_LABELS: Record<StatsPeriod, string> = {
  month: 'Este mes',
  sixMonths: '6 meses',
  year: 'Este año',
};

export interface StatsPeriodRange {
  fromDate: string;
  toDate: string;
}

function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

function toMonthKey(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, '0')}`;
}

/**
 * Inclusive ISO date range for a stats period ending in the current month.
 * `today` is an ISO `YYYY-MM-DD` string (see utils/dates).
 */
export function getStatsPeriodRange(period: StatsPeriod, today: string): StatsPeriodRange {
  const [year, month1] = today.split('-').map(Number);
  if (period === 'year') {
    return { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
  }
  let startYear = year;
  let startMonth1 = month1;
  if (period === 'sixMonths') {
    const totalMonths = year * 12 + (month1 - 1) - 5;
    startYear = Math.floor(totalMonths / 12);
    startMonth1 = (totalMonths % 12) + 1;
  }
  return {
    fromDate: `${toMonthKey(startYear, startMonth1)}-01`,
    toDate: `${toMonthKey(year, month1)}-${daysInMonth(year, month1)}`,
  };
}

/**
 * Ordered `YYYY-MM` keys covering the inclusive range, e.g. for chart buckets.
 * `maxMonthKey` optionally caps the keys (inclusive) so future months stay
 * hidden on the monthly comparison chart.
 */
export function getMonthKeys(fromDate: string, toDate: string, maxMonthKey?: string): string[] {
  const [startYear, startMonth1] = fromDate.slice(0, 7).split('-').map(Number);
  const rangeEndKey = toDate.slice(0, 7);
  const endKey = maxMonthKey !== undefined && maxMonthKey < rangeEndKey ? maxMonthKey : rangeEndKey;
  const keys: string[] = [];
  let year = startYear;
  let month1 = startMonth1;
  let key = toMonthKey(year, month1);
  while (key <= endKey) {
    keys.push(key);
    const totalMonths = year * 12 + (month1 - 1) + 1;
    year = Math.floor(totalMonths / 12);
    month1 = (totalMonths % 12) + 1;
    key = toMonthKey(year, month1);
  }
  return keys;
}

const MONTH_LABELS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

export function formatMonthLabelEs(monthKey: string): string {
  const month1 = Number(monthKey.slice(5, 7));
  return MONTH_LABELS_ES[month1 - 1] ?? monthKey;
}

export interface NetSummary {
  income: number;
  expense: number;
  investment: number;
}

/** Consolidates grouped type/currency totals to EUR. Amounts stay raw (unrounded). */
export function sumNetTotalsEur(rows: readonly TypeCurrencyTotal[], rates: Record<string, number>): NetSummary {
  let income = 0;
  let expense = 0;
  let investment = 0;
  for (const row of rows) {
    const eur = convertToEur(row.total, row.currency, rates).amountEur;
    if (row.type === 'income') {
      income += eur;
    } else if (row.type === 'expense') {
      expense += eur;
    } else {
      investment += eur;
    }
  }
  return { income, expense, investment };
}

/** True when any row uses a non-EUR currency without a stored rate. */
export function detectMissingRates(
  rows: readonly { currency: string }[],
  rates: Record<string, number>,
): boolean {
  return rows.some((row) => row.currency !== 'EUR' && rates[row.currency] === undefined);
}

export interface MonthlyDatum {
  month: string;
  label: string;
  income: number;
  expense: number;
  investment: number;
}

/** Builds one datum per month key in EUR; months without rows read zero. */
export function buildMonthlySeries(
  rows: readonly MonthTypeCurrencyTotal[],
  rates: Record<string, number>,
  monthKeys: string[],
): MonthlyDatum[] {
  const buckets = new Map<string, { income: number; expense: number; investment: number }>();
  for (const key of monthKeys) {
    buckets.set(key, { income: 0, expense: 0, investment: 0 });
  }
  for (const row of rows) {
    const bucket = buckets.get(row.month);
    if (!bucket) {
      continue;
    }
    const eur = convertToEur(row.total, row.currency, rates).amountEur;
    if (row.type === 'income') {
      bucket.income += eur;
    } else if (row.type === 'expense') {
      bucket.expense += eur;
    } else {
      bucket.investment += eur;
    }
  }
  return monthKeys.map((month) => {
    const bucket = buckets.get(month) ?? { income: 0, expense: 0, investment: 0 };
    return {
      month,
      label: formatMonthLabelEs(month),
      income: bucket.income,
      expense: bucket.expense,
      investment: bucket.investment,
    };
  });
}

export const UNCATEGORIZED_LABEL = 'Sin categoría';
export const OTHERS_LABEL = 'Otros';
export const MAX_CATEGORY_SEGMENTS = 7;

export interface CategorySegment {
  categoryId: number | null;
  name: string;
  total: number;
  /** Fraction of the grand total, between 0 and 1. */
  share: number;
  /** True for the folded "Otros" remainder segment. */
  others: boolean;
}

/**
 * Consolidates category/currency expense rows to EUR, sorted by total
 * descending. Beyond `maxSegments` categories the remainder folds into
 * an "Otros" segment. Empty input yields no segments.
 */
export function buildCategoryBreakdown(
  rows: readonly CategoryExpenseTotal[],
  rates: Record<string, number>,
  maxSegments: number = MAX_CATEGORY_SEGMENTS,
): CategorySegment[] {
  const byCategory = new Map<number | null, { name: string; total: number }>();
  for (const row of rows) {
    const entry = byCategory.get(row.categoryId) ?? {
      name: row.categoryName ?? UNCATEGORIZED_LABEL,
      total: 0,
    };
    entry.total += convertToEur(row.total, row.currency, rates).amountEur;
    byCategory.set(row.categoryId, entry);
  }
  const sorted = [...byCategory.entries()]
    .map(([categoryId, entry]) => ({ categoryId, ...entry }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total);
  const grandTotal = sorted.reduce((sum, entry) => sum + entry.total, 0);
  if (grandTotal <= 0) {
    return [];
  }
  const withShare = (
    categoryId: number | null,
    name: string,
    total: number,
    others: boolean,
  ): CategorySegment => ({
    categoryId,
    name,
    total,
    share: total / grandTotal,
    others,
  });
  const segments = sorted
    .slice(0, maxSegments)
    .map((entry) => withShare(entry.categoryId, entry.name, entry.total, false));
  const tail = sorted.slice(maxSegments);
  if (tail.length > 0) {
    const othersTotal = tail.reduce((sum, entry) => sum + entry.total, 0);
    segments.push(withShare(null, OTHERS_LABEL, othersTotal, true));
  }
  return segments;
}

function trimDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
}

/** Short Spanish axis labels: 950 → "950", 1500 → "1,5 mil", 2M → "2 M". */
export function formatCompactAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${trimDecimal(value / 1_000_000)} M`;
  }
  if (abs >= 1000) {
    return `${trimDecimal(value / 1000)} mil`;
  }
  return String(Math.round(value));
}
