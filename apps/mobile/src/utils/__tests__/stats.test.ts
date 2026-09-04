import type {
  CategoryExpenseTotal,
  MonthTypeCurrencyTotal,
  TypeCurrencyTotal,
} from '@/db/repositories/transactions-repo';
import {
  buildCategoryBreakdown,
  buildMonthlySeries,
  detectMissingRates,
  formatCompactAmount,
  formatMonthLabelEs,
  getMonthKeys,
  getStatsPeriodRange,
  sumIncomeExpenseEur,
  OTHERS_LABEL,
  UNCATEGORIZED_LABEL,
} from '@/utils/stats';

describe('stats', () => {
  describe('getStatsPeriodRange', () => {
    it('covers the current calendar month', () => {
      expect(getStatsPeriodRange('month', '2026-09-04')).toEqual({
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      });
    });

    it('clamps February to 28 days outside leap years', () => {
      expect(getStatsPeriodRange('month', '2026-02-10')).toEqual({
        fromDate: '2026-02-01',
        toDate: '2026-02-28',
      });
    });

    it('clamps February to 29 days in leap years', () => {
      expect(getStatsPeriodRange('month', '2024-02-10')).toEqual({
        fromDate: '2024-02-01',
        toDate: '2024-02-29',
      });
    });

    it('covers the last six months including the current one', () => {
      expect(getStatsPeriodRange('sixMonths', '2026-09-04')).toEqual({
        fromDate: '2026-04-01',
        toDate: '2026-09-30',
      });
    });

    it('crosses the year boundary for the six-month range', () => {
      expect(getStatsPeriodRange('sixMonths', '2026-02-15')).toEqual({
        fromDate: '2025-09-01',
        toDate: '2026-02-28',
      });
    });

    it('covers the full calendar year', () => {
      expect(getStatsPeriodRange('year', '2026-09-04')).toEqual({
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
      });
    });
  });

  describe('getMonthKeys', () => {
    it('lists every month in the range', () => {
      expect(getMonthKeys('2026-04-01', '2026-09-30')).toEqual([
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
      ]);
    });

    it('crosses the year boundary', () => {
      expect(getMonthKeys('2025-11-01', '2026-02-28')).toEqual([
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
      ]);
    });

    it('returns a single key for a one-month range', () => {
      expect(getMonthKeys('2026-09-01', '2026-09-30')).toEqual(['2026-09']);
    });

    it('caps keys at the given max month', () => {
      expect(getMonthKeys('2026-01-01', '2026-12-31', '2026-09')).toEqual([
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
      ]);
    });

    it('ignores a max month beyond the range', () => {
      expect(getMonthKeys('2026-09-01', '2026-09-30', '2026-12')).toEqual(['2026-09']);
    });
  });

  describe('formatMonthLabelEs', () => {
    it('abbreviates months in Spanish', () => {
      expect(formatMonthLabelEs('2026-01')).toBe('ene');
      expect(formatMonthLabelEs('2026-09')).toBe('sep');
      expect(formatMonthLabelEs('2026-12')).toBe('dic');
    });
  });

  describe('sumIncomeExpenseEur', () => {
    const rows: TypeCurrencyTotal[] = [
      { type: 'income', currency: 'EUR', total: 1000 },
      { type: 'income', currency: 'USD', total: 200 },
      { type: 'expense', currency: 'EUR', total: 55 },
      { type: 'expense', currency: 'USD', total: 100 },
    ];

    it('converts every currency with the stored rates', () => {
      expect(sumIncomeExpenseEur(rows, { USD: 0.9 })).toEqual({ income: 1180, expense: 145 });
    });

    it('falls back to 1:1 for currencies without a rate', () => {
      expect(sumIncomeExpenseEur(rows, {})).toEqual({ income: 1200, expense: 155 });
    });

    it('returns zeros for empty input', () => {
      expect(sumIncomeExpenseEur([], {})).toEqual({ income: 0, expense: 0 });
    });
  });

  describe('detectMissingRates', () => {
    it('ignores EUR-only rows', () => {
      expect(detectMissingRates([{ currency: 'EUR' }], {})).toBe(false);
    });

    it('accepts rated foreign currencies', () => {
      expect(detectMissingRates([{ currency: 'USD' }], { USD: 0.9 })).toBe(false);
    });

    it('flags unrated foreign currencies', () => {
      expect(detectMissingRates([{ currency: 'EUR' }, { currency: 'USD' }], {})).toBe(true);
    });

    it('returns false for empty input', () => {
      expect(detectMissingRates([], {})).toBe(false);
    });
  });

  describe('buildMonthlySeries', () => {
    const rows: MonthTypeCurrencyTotal[] = [
      { month: '2026-08', type: 'expense', currency: 'EUR', total: 30 },
      { month: '2026-09', type: 'income', currency: 'EUR', total: 1000 },
      { month: '2026-09', type: 'income', currency: 'USD', total: 200 },
      { month: '2026-09', type: 'expense', currency: 'EUR', total: 55 },
    ];

    it('fills months without rows with zeros', () => {
      const series = buildMonthlySeries(rows, { USD: 0.9 }, ['2026-07', '2026-08', '2026-09']);
      expect(series).toEqual([
        { month: '2026-07', label: 'jul', income: 0, expense: 0 },
        { month: '2026-08', label: 'ago', income: 0, expense: 30 },
        { month: '2026-09', label: 'sep', income: 1180, expense: 55 },
      ]);
    });

    it('ignores rows outside the requested keys', () => {
      const series = buildMonthlySeries(rows, {}, ['2026-09']);
      expect(series).toHaveLength(1);
      expect(series[0]).toMatchObject({ month: '2026-09', income: 1200, expense: 55 });
    });
  });

  describe('buildCategoryBreakdown', () => {
    it('sorts categories by total and computes shares', () => {
      const rows: CategoryExpenseTotal[] = [
        { categoryId: 1, categoryName: 'Comida', currency: 'EUR', total: 40 },
        { categoryId: 2, categoryName: 'Ocio', currency: 'EUR', total: 60 },
      ];

      const segments = buildCategoryBreakdown(rows, {});

      expect(segments).toEqual([
        { categoryId: 2, name: 'Ocio', total: 60, share: 0.6, others: false },
        { categoryId: 1, name: 'Comida', total: 40, share: 0.4, others: false },
      ]);
    });

    it('labels uncategorized expenses and converts currencies', () => {
      const rows: CategoryExpenseTotal[] = [
        { categoryId: null, categoryName: null, currency: 'USD', total: 100 },
      ];

      const segments = buildCategoryBreakdown(rows, { USD: 0.9 });

      expect(segments).toEqual([
        { categoryId: null, name: UNCATEGORIZED_LABEL, total: 90, share: 1, others: false },
      ]);
    });

    it('folds categories beyond the limit into an Otros segment', () => {
      const rows: CategoryExpenseTotal[] = Array.from({ length: 9 }, (_, index) => ({
        categoryId: index + 1,
        categoryName: `Categoría ${index + 1}`,
        currency: 'EUR',
        total: 90 - index * 10,
      }));

      const segments = buildCategoryBreakdown(rows, {}, 7);

      expect(segments).toHaveLength(8);
      expect(segments[7]).toMatchObject({ categoryId: null, name: OTHERS_LABEL, others: true });
      expect(segments[7].total).toBe(30);
      const shares = segments.reduce((sum, segment) => sum + segment.share, 0);
      expect(shares).toBeCloseTo(1, 10);
    });

    it('returns no segments for empty input', () => {
      expect(buildCategoryBreakdown([], {})).toEqual([]);
    });
  });

  describe('formatCompactAmount', () => {
    it('keeps small amounts plain', () => {
      expect(formatCompactAmount(0)).toBe('0');
      expect(formatCompactAmount(950)).toBe('950');
      expect(formatCompactAmount(999.6)).toBe('1000');
    });

    it('abbreviates thousands in Spanish', () => {
      expect(formatCompactAmount(1000)).toBe('1 mil');
      expect(formatCompactAmount(1500)).toBe('1,5 mil');
      expect(formatCompactAmount(2000)).toBe('2 mil');
    });

    it('abbreviates millions', () => {
      expect(formatCompactAmount(1_250_000)).toBe('1,3 M');
      expect(formatCompactAmount(2_000_000)).toBe('2 M');
    });

    it('keeps the sign of negative values', () => {
      expect(formatCompactAmount(-1500)).toBe('-1,5 mil');
    });
  });
});
