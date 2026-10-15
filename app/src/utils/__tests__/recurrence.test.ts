import { computeCatchUpDates, nextOccurrence } from '../recurrence';

describe('recurrence', () => {
  describe('nextOccurrence', () => {
    it('weekly adds 7 days', () => {
      expect(nextOccurrence('2026-01-01', 'weekly')).toBe('2026-01-08');
    });

    it('every_n_days adds N days', () => {
      expect(nextOccurrence('2026-01-01', 'every_n_days', 3)).toBe('2026-01-04');
      expect(nextOccurrence('2026-01-10', 'every_n_days', 10)).toBe('2026-01-20');
    });

    it('throws for every_n_days without valid interval', () => {
      expect(() => nextOccurrence('2026-01-01', 'every_n_days', 0)).toThrow();
      expect(() => nextOccurrence('2026-01-01', 'every_n_days', null)).toThrow();
    });

    it('monthly clamps end-of-month (Jan 31 -> Feb 28)', () => {
      expect(nextOccurrence('2026-01-31', 'monthly')).toBe('2026-02-28');
    });

    it('monthly with anchor day restores the anchor after a clamped month (Jan 31 -> Feb 28 -> Mar 31)', () => {
      expect(nextOccurrence('2026-01-31', 'monthly', null, 31)).toBe('2026-02-28');
      expect(nextOccurrence('2026-02-28', 'monthly', null, 31)).toBe('2026-03-31');
    });

    it('yearly with anchor day 29 returns to Feb 29 on leap years', () => {
      expect(nextOccurrence('2027-02-28', 'yearly', null, 29)).toBe('2028-02-29');
    });

    it('monthly preserves day when no clamp needed', () => {
      expect(nextOccurrence('2026-01-15', 'monthly')).toBe('2026-02-15');
    });

    it('monthly handles Jan 31 in leap year (Jan 31 -> Feb 29)', () => {
      expect(nextOccurrence('2024-01-31', 'monthly')).toBe('2024-02-29');
    });

    it('yearly clamps Feb 29 to Feb 28 on non-leap year', () => {
      expect(nextOccurrence('2024-02-29', 'yearly')).toBe('2025-02-28');
    });

    it('yearly preserves Feb 28 on non-leap to leap', () => {
      expect(nextOccurrence('2025-02-28', 'yearly')).toBe('2026-02-28');
    });

    it('yearly preserves same date normally', () => {
      expect(nextOccurrence('2026-03-15', 'yearly')).toBe('2027-03-15');
    });
  });

  describe('computeCatchUpDates', () => {
    it('returns empty when nextExecution is after asOf', () => {
      expect(computeCatchUpDates('2026-02-01', '2026-01-15', 'weekly')).toEqual([]);
    });

    it('returns single date when due today', () => {
      expect(computeCatchUpDates('2026-01-15', '2026-01-15', 'weekly')).toEqual(['2026-01-15']);
    });

    it('catches up multiple weekly occurrences', () => {
      // Due Jan 1, asOf Jan 15 => Jan 1, Jan 8, Jan 15
      expect(computeCatchUpDates('2026-01-01', '2026-01-15', 'weekly')).toEqual([
        '2026-01-01',
        '2026-01-08',
        '2026-01-15',
      ]);
    });

    it('catches up every_n_days', () => {
      expect(computeCatchUpDates('2026-01-01', '2026-01-07', 'every_n_days', 3)).toEqual([
        '2026-01-01',
        '2026-01-04',
        '2026-01-07',
      ]);
    });

    it('catches up monthly with clamp and anchor', () => {
      expect(computeCatchUpDates('2026-01-31', '2026-03-31', 'monthly', null, 31)).toEqual([
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
      ]);
    });

    it('catches up yearly', () => {
      expect(computeCatchUpDates('2024-02-29', '2026-02-28', 'yearly')).toEqual([
        '2024-02-29',
        '2025-02-28',
        '2026-02-28',
      ]);
    });
  });
});
