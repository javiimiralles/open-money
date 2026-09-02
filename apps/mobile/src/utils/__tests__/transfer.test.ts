import { crossRate, destinationAmountFromRate, rateFromAmounts, roundToCents } from '@/utils/transfer';

describe('transfer utils', () => {
  describe('roundToCents', () => {
    it('rounds to two decimals', () => {
      expect(roundToCents(1.006)).toBe(1.01);
      expect(roundToCents(1.004)).toBe(1);
      expect(roundToCents(110.555)).toBe(110.56);
    });
  });

  describe('crossRate', () => {
    const rates = { EUR: 1, USD: 1.1, GBP: 0.85 };

    it('returns 1 for the same currency', () => {
      expect(crossRate('EUR', 'EUR', rates)).toBe(1);
    });

    it('derives the cross rate from rates against EUR', () => {
      expect(crossRate('EUR', 'USD', rates)).toBeCloseTo(1.1);
      expect(crossRate('USD', 'EUR', rates)).toBeCloseTo(1 / 1.1);
      expect(crossRate('USD', 'GBP', rates)).toBeCloseTo(0.85 / 1.1);
    });

    it('returns null when a currency has no stored rate', () => {
      expect(crossRate('EUR', 'JPY', rates)).toBeNull();
      expect(crossRate('JPY', 'EUR', rates)).toBeNull();
    });
  });

  describe('destinationAmountFromRate', () => {
    it('multiplies and rounds to cents', () => {
      expect(destinationAmountFromRate(100, 1.1)).toBe(110);
      expect(destinationAmountFromRate(33.33, 1.1)).toBe(36.66);
    });
  });

  describe('rateFromAmounts', () => {
    it('derives the rate from the amounts', () => {
      expect(rateFromAmounts(100, 110)).toBe(1.1);
      expect(rateFromAmounts(100, 111)).toBe(1.11);
    });
  });
});