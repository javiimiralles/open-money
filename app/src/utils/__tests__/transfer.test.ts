import {
  applyTransferAmount,
  applyTransferDestinationAmount,
  applyTransferFxRate,
  crossRate,
  destinationAmountFromRate,
  rateFromAmounts,
  roundToCents,
  transferDefaults,
  type TransferFormValues,
} from '@/utils/transfer';

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

    it('treats EUR as the base currency even when not stored in rates', () => {
      expect(crossRate('EUR', 'USD', { USD: 1.1 })).toBeCloseTo(1.1);
      expect(crossRate('USD', 'EUR', { USD: 1.1 })).toBeCloseTo(1 / 1.1);
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

    it('does not round the rate so the destination amount round-trips', () => {
      expect(rateFromAmounts(100, 108.34)).toBeCloseTo(1.0834, 10);
      expect(destinationAmountFromRate(100, rateFromAmounts(100, 108.34))).toBe(108.34);
    });
  });

  describe('transfer form helpers', () => {
    const accounts = [
      { id: 1, currency: 'EUR' },
      { id: 2, currency: 'EUR' },
      { id: 3, currency: 'USD' },
    ];
    const rates = { USD: 1.1 };
    const base: TransferFormValues = {
      amount: '100',
      accountId: 1,
      destinationAccountId: 3,
      destinationAmount: '',
      fxRate: '',
    };

    it('transferDefaults handles missing, same and cross currency accounts', () => {
      expect(transferDefaults({ ...base, destinationAccountId: null }, accounts, rates)).toEqual({
        destinationAmount: '',
        fxRate: '',
      });
      expect(transferDefaults({ ...base, destinationAccountId: 2 }, accounts, rates)).toEqual({
        destinationAmount: '100',
        fxRate: '',
      });
      expect(transferDefaults(base, accounts, rates)).toEqual({ destinationAmount: '110', fxRate: '1.1' });
      expect(transferDefaults(base, accounts, {})).toEqual({ destinationAmount: '', fxRate: '' });
    });

    it('applyTransferAmount keeps same-currency amounts equal and rescales with an existing rate', () => {
      expect(applyTransferAmount({ ...base, destinationAccountId: 2 }, '50', accounts, rates)).toMatchObject({
        amount: '50',
        destinationAmount: '50',
        fxRate: '',
      });
      expect(applyTransferAmount({ ...base, fxRate: '2' }, '50', accounts, rates)).toMatchObject({
        destinationAmount: '100',
        fxRate: '2',
      });
    });

    it('applyTransferAmount prefills the rate when none is set', () => {
      expect(applyTransferAmount(base, '10', accounts, rates)).toMatchObject({ destinationAmount: '11', fxRate: '1.1' });
    });

    it('applyTransferFxRate and applyTransferDestinationAmount derive each other', () => {
      expect(applyTransferFxRate(base, '1.5')).toMatchObject({ fxRate: '1.5', destinationAmount: '150' });
      expect(applyTransferDestinationAmount(base, '108.34')).toMatchObject({ fxRate: '1.0834' });
      expect(applyTransferFxRate({ ...base, amount: '' }, '1.5').destinationAmount).toBe('');
    });
  });
});