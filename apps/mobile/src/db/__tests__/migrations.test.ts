import { migrate } from '@/db/client';
import { BASE_CATEGORIES, seedCategoriesSql } from '@/db/seed';
import { countCategoriesByKind } from '@/db/repositories/categories-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

describe('migrations', () => {
  it('applies migration v1 and seeds the base category catalog', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(4);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toEqual(
      expect.arrayContaining([
        'accounts',
        'transactions',
        'categories',
        'recurring_rules',
        'instruments',
        'trades',
        'exchange_rates',
        'settings',
      ]),
    );

    const total = await countCategoriesByKind(db, 'expense');
    const income = await countCategoriesByKind(db, 'income');
    expect(income).toBe(BASE_CATEGORIES.filter((c) => c.kind === 'income').length);
    expect(total).toBe(BASE_CATEGORIES.filter((c) => c.kind === 'expense').length);

    db.close();
  });

  it('applies migration v2 with the compound transaction index', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    const index = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_transactions_account_date'",
    );
    expect(index?.name).toBe('idx_transactions_account_date');

    db.close();
  });

  it('applies migration v3 with the transfer destination index', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    const index = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_transactions_destination_account'",
    );
    expect(index?.name).toBe('idx_transactions_destination_account');

    db.close();
  });

  it('is idempotent: running migrate twice does not duplicate seed data', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    await migrate(db);

    const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories');
    expect(count?.count).toBe(BASE_CATEGORIES.length);

    db.close();
  });

  it('seed SQL uses INSERT OR IGNORE so re-running it does not duplicate rows', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    // Simulate a re-run of the seed (e.g. a future migration re-seeding).
    await db.execAsync(seedCategoriesSql());

    const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories');
    expect(count?.count).toBe(BASE_CATEGORIES.length);

    db.close();
  });

  it('is a no-op on a database already at the latest version', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    const versionBefore = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version;

    // Simulate a later app version by faking a higher user_version, then migrate.
    await db.execAsync('PRAGMA user_version = 999');
    await migrate(db);
    const versionAfter = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version;
    expect(versionBefore).toBe(4);
    expect(versionAfter).toBe(999);

    db.close();
  });

  it('enables foreign key enforcement in the schema', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    // Inserting a transaction referencing a non-existent account must fail.
    await expect(
      db.runAsync('INSERT INTO transactions (type, date, amount, account_id) VALUES (?, ?, ?, ?)', [
        'expense',
        '2026-09-01',
        10,
        999,
      ]),
    ).rejects.toThrow();

    db.close();
  });
});