import { BASE_CATEGORIES } from '@/db/seed';
import {
  DEV_RATES_TO_EUR,
  generateDevDataset,
  toRecurringRuleInputs,
  toTransactionInputs,
  type DevDataset,
} from '@/db/dev-data-generator';
import { roundToCents } from '@/utils/transfer';

const TODAY = '2026-09-04';
const SEED = 1234;
const ISO_DATE = /^\d{4}-\d{2}-(0[1-9]|[12]\d|3[01])$/;
const FIRST_DAY = '2025-10-01';

const kindByCategoryId = new Map(BASE_CATEGORIES.map((category) => [category.id, category.kind]));

function currencyByAccountKey(dataset: DevDataset): Map<string, string> {
  return new Map(dataset.accounts.map((account) => [account.key, account.input.currency]));
}

describe('dev-data-generator', () => {
  it('produces the same dataset for the same seed and today', () => {
    expect(generateDevDataset({ seed: SEED, today: TODAY })).toEqual(
      generateDevDataset({ seed: SEED, today: TODAY }),
    );
  });

  it('produces different transactions for different seeds', () => {
    const first = generateDevDataset({ seed: SEED, today: TODAY });
    const second = generateDevDataset({ seed: SEED + 1, today: TODAY });
    expect(second.transactions).not.toEqual(first.transactions);
  });

  it('generates six accounts with a single primary', () => {
    const dataset = generateDevDataset({ seed: SEED, today: TODAY });
    expect(dataset.accounts).toHaveLength(6);
    expect(new Set(dataset.accounts.map((account) => account.key)).size).toBe(6);
    expect(dataset.accounts.filter((account) => account.input.isPrimary === true)).toHaveLength(1);
  });

  it('generates a large volume of valid transactions', () => {
    const dataset = generateDevDataset({ seed: SEED, today: TODAY });
    const currencies = currencyByAccountKey(dataset);
    expect(dataset.transactions.length).toBeGreaterThan(500);

    for (const transaction of dataset.transactions) {
      expect(transaction.amount).toBeGreaterThan(0);
      expect(roundToCents(transaction.amount)).toBe(transaction.amount);
      expect(transaction.date).toMatch(ISO_DATE);
      expect(transaction.date >= FIRST_DAY).toBe(true);
      expect(transaction.date <= TODAY).toBe(true);
      expect(transaction.currency).toBe(currencies.get(transaction.accountKey));
      expect(typeof transaction.notes === 'string' || transaction.notes === null).toBe(true);

      if (transaction.type === 'transfer') {
        expect(transaction.destinationAccountKey).not.toBeNull();
        expect(transaction.destinationAccountKey).not.toBe(transaction.accountKey);
        expect(transaction.categoryId).toBeNull();
        const destinationCurrency = currencies.get(transaction.destinationAccountKey ?? '');
        if (destinationCurrency === transaction.currency) {
          expect(transaction.fxRate).toBeNull();
          expect(transaction.destinationAmount).toBe(transaction.amount);
        } else {
          expect(transaction.fxRate).not.toBeNull();
          expect(transaction.fxRate).toBeGreaterThan(0);
          expect(transaction.destinationAmount).toBe(roundToCents(transaction.amount * (transaction.fxRate ?? 0)));
        }
      } else {
        expect(kindByCategoryId.get(transaction.categoryId ?? 0)).toBe(transaction.type);
        expect(transaction.destinationAccountKey).toBeNull();
        expect(transaction.destinationAmount).toBeNull();
        expect(transaction.fxRate).toBeNull();
      }
    }
  });

  it('generates valid recurring rules', () => {
    const dataset = generateDevDataset({ seed: SEED, today: TODAY });
    const currencies = currencyByAccountKey(dataset);
    expect(dataset.recurringRules).toHaveLength(8);

    for (const rule of dataset.recurringRules) {
      expect(['weekly', 'monthly', 'yearly', 'every_n_days']).toContain(rule.frequency);
      expect(rule.nextExecution).toMatch(ISO_DATE);
      expect(rule.currency).toBe(currencies.get(rule.accountKey));
      if (rule.frequency === 'every_n_days') {
        expect(rule.intervalDays).not.toBeNull();
      } else {
        expect(rule.intervalDays).toBeNull();
      }
      if (rule.type === 'transfer') {
        expect(rule.destinationAccountKey).not.toBeNull();
        expect(rule.destinationAccountKey).not.toBe(rule.accountKey);
        expect(rule.categoryId).toBeNull();
      } else {
        expect(rule.destinationAccountKey).toBeNull();
        expect(kindByCategoryId.get(rule.categoryId ?? 0)).toBe(rule.type);
        expect(rule.fxRate).toBeNull();
      }
    }
    expect(dataset.recurringRules.some((rule) => !rule.active)).toBe(true);
  });

  it('generates exchange rates for the non-EUR accounts', () => {
    const dataset = generateDevDataset({ seed: SEED, today: TODAY });
    expect(dataset.exchangeRates).toEqual([
      { currency: 'USD', rateToEur: DEV_RATES_TO_EUR.USD },
      { currency: 'GBP', rateToEur: DEV_RATES_TO_EUR.GBP },
    ]);
  });

  it('maps account keys to ids when building repo inputs', () => {
    const dataset = generateDevDataset({ seed: SEED, today: TODAY });
    const accountIds = new Map(dataset.accounts.map((account, index) => [account.key, index + 1] as const));

    for (const input of toTransactionInputs(dataset, accountIds)) {
      expect(input.accountId).toBeGreaterThan(0);
      if (input.type === 'transfer') {
        expect(input.destinationAccountId).toBeGreaterThan(0);
        expect(input.destinationAccountId).not.toBe(input.accountId);
      }
    }
    for (const input of toRecurringRuleInputs(dataset, accountIds)) {
      expect(input.accountId).toBeGreaterThan(0);
      if (input.type === 'transfer') {
        expect(input.destinationAccountId).not.toBeNull();
      } else {
        expect(input.destinationAccountId).toBeNull();
      }
    }
  });
});
