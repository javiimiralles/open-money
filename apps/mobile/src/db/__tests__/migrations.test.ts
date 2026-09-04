import { migrate, MIGRATIONS } from '@/db/client';
import { BASE_CATEGORIES, seedCategoriesSql } from '@/db/seed';
import { countCategoriesByKind } from '@/db/repositories/categories-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

async function migrateToVersion(db: BetterSqliteExecutor, version: number): Promise<void> {
  for (const migration of MIGRATIONS.filter((entry) => entry.version <= version)) {
    await db.execAsync('BEGIN');
    await db.execAsync(migration.up);
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    await db.execAsync('COMMIT');
  }
}

describe('migrations', () => {
  it('applies migration v1 and seeds the base category catalog', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(9);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toEqual([
      'accounts',
      'categories',
      'exchange_rates',
      'recurring_rules',
      'settings',
      'transactions',
    ]);

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

  it('applies migration v9 dropping the investment schema and preserving rule links', async () => {
    const db = new BetterSqliteExecutor();
    await migrateToVersion(db, 8);

    await db.runAsync("INSERT INTO accounts (name, currency, initial_balance) VALUES ('Broker', 'EUR', 1000)");
    await db.runAsync(
      "INSERT INTO instruments (symbol, name, currency, kind) VALUES ('SAN.MC', 'Banco Santander', 'EUR', 'stock')",
    );
    await db.runAsync(
      "INSERT INTO trades (instrument_id, type, date, quantity, price, currency, account_id) VALUES (1, 'buy', '2026-09-01', 10, 3.5, 'EUR', 1)",
    );
    await db.runAsync(
      `INSERT INTO recurring_rules (type, amount, currency, account_id, frequency, next_execution, active)
       VALUES ('investment', 100, 'EUR', 1, 'monthly', '2026-10-01', 1)`,
    );
    await db.runAsync(
      `INSERT INTO recurring_rules (type, amount, currency, account_id, frequency, next_execution, active)
       VALUES ('expense', 50, 'EUR', 1, 'monthly', '2026-10-01', 1)`,
    );
    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, source, recurring_rule_id)
       VALUES ('expense', '2026-09-01', 50, 'EUR', 1, 'recurring', 2)`,
    );
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('backend_url', 'https://api.example.com')");
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('api_key', 'secret')");

    await migrate(db);

    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(9);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type IN ('table', 'index') AND name IN ('instruments', 'trades', 'idx_instruments_symbol', 'idx_trades_instrument')",
    );
    expect(tables).toEqual([]);

    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(recurring_rules)');
    expect(columns.map((column) => column.name)).not.toContain('instrument_id');

    const rules = await db.getAllAsync<{ id: number; type: string }>('SELECT id, type FROM recurring_rules');
    expect(rules).toEqual([{ id: 2, type: 'expense' }]);

    const links = await db.getAllAsync<{ recurring_rule_id: number | null }>(
      'SELECT recurring_rule_id FROM transactions',
    );
    expect(links).toEqual([{ recurring_rule_id: 2 }]);

    await expect(
      db.runAsync(
        `INSERT INTO recurring_rules (type, amount, currency, account_id, frequency, next_execution, active)
         VALUES ('investment', 100, 'EUR', 1, 'monthly', '2026-11-01', 1)`,
      ),
    ).rejects.toThrow();

    const settings = await db.getAllAsync<{ key: string }>('SELECT key FROM settings');
    expect(settings).toEqual([]);

    db.close();
  });

  it('applies migration v6 with the nullable account color column', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(accounts)');
    expect(columns.map((column) => column.name)).toContain('color');

    await db.runAsync(
      "INSERT INTO accounts (name, currency, initial_balance, color) VALUES ('Coloreada', 'EUR', 0, '#9fe870')",
    );
    const row = await db.getFirstAsync<{ color: string | null }>(
      "SELECT color FROM accounts WHERE name = 'Coloreada'",
    );
    expect(row?.color).toBe('#9fe870');

    db.close();
  });

  it('applies migration v7 with the non-null primary account flag', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    const columns = await db.getAllAsync<{ name: string; notnull: number; dflt_value: string | null }>(
      'PRAGMA table_info(accounts)',
    );
    const flag = columns.find((column) => column.name === 'is_primary');
    expect(flag).toMatchObject({ notnull: 1, dflt_value: '0' });

    await db.runAsync("INSERT INTO accounts (name, currency, initial_balance) VALUES ('Banco', 'EUR', 0)");
    const row = await db.getFirstAsync<{ is_primary: number }>(
      "SELECT is_primary FROM accounts WHERE name = 'Banco'",
    );
    expect(row?.is_primary).toBe(0);

    db.close();
  });

  it('applies migration v8 with the nullable category icon column and base icon backfill', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);

    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categories)');
    expect(columns.map((column) => column.name)).toContain('icon');

    const missing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM categories WHERE icon IS NULL',
    );
    expect(missing?.count).toBe(0);

    const row = await db.getFirstAsync<{ icon: string | null }>(
      "SELECT icon FROM categories WHERE name = 'Nómina'",
    );
    expect(row?.icon).toBe('briefcase');

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
    expect(versionBefore).toBe(9);
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