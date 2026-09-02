import type { TransactionWithDetails } from '@/db/repositories/transactions-repo';
import { groupByDay, signedAmount, summarizeTransactions } from '@/utils/transaction-groups';

function tx(overrides: Partial<TransactionWithDetails> = {}): TransactionWithDetails {
  return {
    id: 1,
    type: 'expense',
    date: '2026-09-01',
    amount: 10,
    currency: 'EUR',
    accountId: 1,
    categoryId: null,
    notes: null,
    createdAt: '2026-09-01T00:00:00',
    updatedAt: '2026-09-01T00:00:00',
    accountName: 'Banco',
    categoryName: null,
    destinationAccountId: null,
    destinationAmount: null,
    destinationAccountName: null,
    destinationCurrency: null,
    fxRate: null,
    ...overrides,
  };
}

describe('signedAmount', () => {
  it('is positive for income', () => {
    expect(signedAmount(tx({ type: 'income', amount: 50 }))).toBe(50);
  });

  it('is negative for expense', () => {
    expect(signedAmount(tx({ type: 'expense', amount: 30 }))).toBe(-30);
  });

  it('is neutral for transfers', () => {
    expect(signedAmount(tx({ type: 'transfer', amount: 100 }))).toBe(0);
  });
});

describe('groupByDay', () => {
  it('groups by day with signed totals, newest day first', () => {
    const items = [
      tx({ id: 1, date: '2026-09-01', type: 'expense', amount: 10 }),
      tx({ id: 2, date: '2026-09-01', type: 'income', amount: 50 }),
      tx({ id: 3, date: '2026-08-30', type: 'expense', amount: 20 }),
    ];

    const groups = groupByDay(items);
    expect(groups.map((g) => g.date)).toEqual(['2026-09-01', '2026-08-30']);
    expect(groups[0].signedTotal).toBe(40);
    expect(groups[0].items.map((i) => i.id)).toEqual([1, 2]);
    expect(groups[1].signedTotal).toBe(-20);
  });

  it('keeps the day currency when all items share it', () => {
    const groups = groupByDay([tx({ id: 1, currency: 'EUR' }), tx({ id: 2, currency: 'EUR' })]);
    expect(groups[0].currency).toBe('EUR');
  });

  it('marks a day as mixed currencies', () => {
    const groups = groupByDay([tx({ id: 1, currency: 'EUR' }), tx({ id: 2, currency: 'USD' })]);
    expect(groups[0].currency).toBeNull();
  });

  it('returns an empty array for no items', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('summarizeTransactions', () => {
  it('computes count and net total', () => {
    const items = [
      tx({ type: 'income', amount: 100 }),
      tx({ type: 'expense', amount: 30 }),
      tx({ type: 'expense', amount: 20 }),
    ];

    const summary = summarizeTransactions(items);
    expect(summary).toEqual({ count: 3, net: 50, currency: 'EUR', mixedCurrencies: false });
  });

  it('flags mixed currencies and drops the total currency', () => {
    const items = [tx({ currency: 'EUR', amount: 10 }), tx({ currency: 'USD', amount: 10 })];

    const summary = summarizeTransactions(items);
    expect(summary.mixedCurrencies).toBe(true);
    expect(summary.currency).toBeNull();
  });

  it('returns zeros for an empty list', () => {
    expect(summarizeTransactions([])).toEqual({ count: 0, net: 0, currency: null, mixedCurrencies: false });
  });
});