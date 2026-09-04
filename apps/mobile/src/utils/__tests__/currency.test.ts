import { migrate } from '@/db/client';
import type { AccountWithBalance } from '@/db/repositories/accounts-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';
import { convertToEur, getLatestRatesToEur, toAccountListItems } from '@/utils/currency';

describe('convertToEur', () => {
  it('returns the amount unchanged for EUR', () => {
    expect(convertToEur(100, 'EUR', {})).toEqual({ amountEur: 100, rate: 1, rateMissing: false });
  });

  it('converts using the stored rate', () => {
    expect(convertToEur(100, 'USD', { USD: 0.92 })).toEqual({ amountEur: 92, rate: 0.92, rateMissing: false });
  });

  it('falls back to rate 1 and flags the missing rate', () => {
    expect(convertToEur(100, 'USD', {})).toEqual({ amountEur: 100, rate: 1, rateMissing: true });
  });
});

describe('getLatestRatesToEur', () => {
  it('returns the latest rate per currency', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    await db.runAsync(
      "INSERT INTO exchange_rates (currency, rate_to_eur, fetched_at, is_manual) VALUES ('USD', 0.9, '2026-09-01 10:00:00', 1)",
    );
    await db.runAsync(
      "INSERT INTO exchange_rates (currency, rate_to_eur, fetched_at, is_manual) VALUES ('USD', 0.92, '2026-09-02 10:00:00', 1)",
    );
    await db.runAsync(
      "INSERT INTO exchange_rates (currency, rate_to_eur, fetched_at, is_manual) VALUES ('GBP', 1.15, '2026-09-01 10:00:00', 1)",
    );

    const rates = await getLatestRatesToEur(db);
    expect(rates).toEqual({ USD: 0.92, GBP: 1.15 });

    db.close();
  });

  it('returns an empty map when no rates are stored', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    expect(await getLatestRatesToEur(db)).toEqual({});

    db.close();
  });
});

describe('toAccountListItems', () => {
  const baseAccount: AccountWithBalance = {
    id: 1,
    name: 'Cash',
    identifier: null,
    currency: 'EUR',
    initialBalance: 100,
    color: null,
    isPrimary: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    balance: 150,
  };

  it('attaches the EUR equivalent to every account', () => {
    const accounts: AccountWithBalance[] = [
      baseAccount,
      { ...baseAccount, id: 2, name: 'Broker', currency: 'USD', balance: 100, isPrimary: false },
    ];

    expect(toAccountListItems(accounts, { USD: 0.9 })).toEqual([
      { ...accounts[0], eurEquivalent: 150, rateMissing: false },
      { ...accounts[1], eurEquivalent: 90, rateMissing: false },
    ]);
  });

  it('flags accounts whose rate is missing', () => {
    const accounts: AccountWithBalance[] = [{ ...baseAccount, id: 3, currency: 'USD' }];

    expect(toAccountListItems(accounts, {})).toEqual([
      { ...accounts[0], eurEquivalent: 150, rateMissing: true },
    ]);
  });

  it('returns an empty list when there are no accounts', () => {
    expect(toAccountListItems([], {})).toEqual([]);
  });
});
