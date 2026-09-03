import type { TransactionWithDetails } from '@/db/repositories/transactions-repo';
import { buildTransactionsCsv } from '@/utils/csv';

function row(overrides: Partial<TransactionWithDetails> = {}): TransactionWithDetails {
  return {
    id: 1,
    type: 'expense',
    date: '2026-02-01',
    amount: 12.5,
    currency: 'EUR',
    accountId: 1,
    categoryId: 1,
    notes: null,
    destinationAccountId: null,
    destinationAmount: null,
    fxRate: null,
    source: 'manual',
    recurringRuleId: null,
    recurringBatchId: null,
    createdAt: '2026-02-01',
    updatedAt: '2026-02-01',
    accountName: 'Cash',
    categoryName: 'Food',
    destinationAccountName: null,
    destinationCurrency: null,
    ...overrides,
  };
}

describe('buildTransactionsCsv', () => {
  it('renders the header and one row per transaction with the specified columns', () => {
    const csv = buildTransactionsCsv([
      row({ notes: 'Lunch' }),
      row({ id: 2, type: 'income', amount: 100, categoryName: null, notes: null }),
    ]);

    expect(csv).toBe(
      'date,type,amount,currency,account,category,notes\r\n' +
        '2026-02-01,expense,12.5,EUR,Cash,Food,Lunch\r\n' +
        '2026-02-01,income,100,EUR,Cash,,\r\n',
    );
  });

  it('renders transfers as Origin → Destination in the account column', () => {
    const csv = buildTransactionsCsv([
      row({
        type: 'transfer',
        accountName: 'Cash',
        categoryName: null,
        destinationAccountId: 2,
        destinationAccountName: 'Bank',
      }),
    ]);

    expect(csv).toContain('2026-02-01,transfer,12.5,EUR,Cash → Bank,,');
  });

  it('escapes commas, quotes and newlines per RFC 4180', () => {
    const csv = buildTransactionsCsv([
      row({ accountName: 'Cash, joint', notes: 'Lunch "special"\nwith dessert' }),
    ]);

    expect(csv).toContain('"Cash, joint"');
    expect(csv).toContain('"Lunch ""special""\nwith dessert"');
  });

  it('renders only the header for an empty list', () => {
    expect(buildTransactionsCsv([])).toBe('date,type,amount,currency,account,category,notes\r\n');
  });
});
