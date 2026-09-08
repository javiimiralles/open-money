import { migrate } from '@/db/client';
import { clearAllDevData, seedDevData } from '@/db/dev-seed';
import { DEV_SEED_DEFAULT, generateDevDataset } from '@/db/dev-data-generator';
import { BASE_CATEGORIES, INVESTMENT_CATEGORIES } from '@/db/seed';
import { listAccountsWithBalances, insertAccount } from '@/db/repositories/accounts-repo';
import { getAllCategories } from '@/db/repositories/categories-repo';
import { listRecurringRules } from '@/db/repositories/recurring-rules-repo';
import { getThemeMode, saveThemeMode } from '@/db/repositories/settings-repo';
import { insertTransaction, listTransactions } from '@/db/repositories/transactions-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';
import { getLatestRatesToEur } from '@/utils/currency';

describe('dev-seed', () => {
  async function createDb() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    return db;
  }

  it('seeds a full fake dataset', async () => {
    const db = await createDb();
    const summary = await seedDevData(db);

    expect(summary.accounts).toBe(6);
    expect(summary.recurringRules).toBe(8);
    expect(summary.transactions).toBe(generateDevDataset({ seed: DEV_SEED_DEFAULT }).transactions.length);
    expect(summary.transactions).toBeGreaterThan(500);

    const accounts = await listAccountsWithBalances(db);
    expect(accounts).toHaveLength(6);
    expect(accounts.filter((account) => account.isPrimary)).toHaveLength(1);
    expect(accounts.map((account) => account.currency).sort()).toEqual(
      ['EUR', 'EUR', 'EUR', 'EUR', 'GBP', 'USD'].sort(),
    );

    const categories = await getAllCategories(db);
    expect(categories).toHaveLength(BASE_CATEGORIES.length + INVESTMENT_CATEGORIES.length);
    expect(categories.find((category) => category.name === 'Nómina')).toMatchObject({ icon: 'briefcase' });
    expect(categories.find((category) => category.name === 'Fondos indexados')).toMatchObject({
      kind: 'investment',
      icon: 'chart-line',
    });

    expect(await listRecurringRules(db)).toHaveLength(8);
    expect(await getLatestRatesToEur(db)).toEqual({ USD: 0.92, GBP: 1.17 });
    db.close();
  });

  it('replaces previous data when seeding again', async () => {
    const db = await createDb();
    await seedDevData(db, { seed: 1 });
    await seedDevData(db, { seed: 2 });

    expect(await listAccountsWithBalances(db)).toHaveLength(6);
    expect(await listRecurringRules(db)).toHaveLength(8);
    expect(await getAllCategories(db)).toHaveLength(BASE_CATEGORIES.length + INVESTMENT_CATEGORIES.length);
    db.close();
  });

  it('wipes pre-existing user data when seeding', async () => {
    const db = await createDb();
    const accountId = await insertAccount(db, {
      name: 'Mi cuenta',
      identifier: null,
      currency: 'EUR',
      initialBalance: 10,
    });
    await insertTransaction(db, {
      type: 'expense',
      date: '2026-09-01',
      amount: 5,
      currency: 'EUR',
      accountId,
      categoryId: 8,
      notes: null,
    });

    await seedDevData(db);

    const accounts = await listAccountsWithBalances(db);
    expect(accounts).toHaveLength(6);
    expect(accounts.some((account) => account.name === 'Mi cuenta')).toBe(false);
    db.close();
  });

  it('clears all user data but keeps settings and base categories', async () => {
    const db = await createDb();
    await seedDevData(db);
    await saveThemeMode(db, 'dark');

    await clearAllDevData(db);

    expect(await listAccountsWithBalances(db)).toHaveLength(0);
    expect(await listTransactions(db)).toHaveLength(0);
    expect(await listRecurringRules(db)).toHaveLength(0);
    expect(await getLatestRatesToEur(db)).toEqual({});
    expect(await getAllCategories(db)).toHaveLength(BASE_CATEGORIES.length + INVESTMENT_CATEGORIES.length);
    expect(await getThemeMode(db)).toBe('dark');
    db.close();
  });
});
