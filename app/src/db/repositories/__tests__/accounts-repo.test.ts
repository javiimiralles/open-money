import { migrate } from '@/db/client';
import {
  countActiveRecurringRulesForAccount,
  countTransactionsForAccount,
  deleteAccount,
  getAccountById,
  insertAccount,
  listAccountsWithBalances,
  updateAccount,
} from '@/db/repositories/accounts-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

describe('accounts-repo', () => {
  async function createDb() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    return db;
  }

  it('creates an account and lists it with balance equal to the initial balance', async () => {
    const db = await createDb();
    const id = await insertAccount(db, { name: 'Efectivo', identifier: null, currency: 'EUR', initialBalance: 100 });
    expect(id).toBeGreaterThan(0);

    const accounts = await listAccountsWithBalances(db);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      id,
      name: 'Efectivo',
      identifier: null,
      currency: 'EUR',
      initialBalance: 100,
      balance: 100,
    });
    db.close();
  });

  it('defaults color to null and returns it in listings', async () => {
    const db = await createDb();
    const id = await insertAccount(db, { name: 'Efectivo', identifier: null, currency: 'EUR', initialBalance: 100 });

    expect(await getAccountById(db, id)).toMatchObject({ color: null });
    const accounts = await listAccountsWithBalances(db);
    expect(accounts[0].color).toBeNull();
    db.close();
  });

  it('stores and updates the account color', async () => {
    const db = await createDb();
    const id = await insertAccount(db, {
      name: 'Efectivo',
      identifier: null,
      currency: 'EUR',
      initialBalance: 100,
      color: '#9fe870',
    });

    expect(await getAccountById(db, id)).toMatchObject({ color: '#9fe870' });

    await updateAccount(db, id, {
      name: 'Efectivo',
      identifier: null,
      currency: 'EUR',
      initialBalance: 100,
      color: '#38c8ff',
    });
    expect(await getAccountById(db, id)).toMatchObject({ color: '#38c8ff' });

    const accounts = await listAccountsWithBalances(db);
    expect(accounts[0].color).toBe('#38c8ff');
    db.close();
  });

  it('defaults new accounts to non-primary', async () => {
    const db = await createDb();
    const id = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 100 });

    expect(await getAccountById(db, id)).toMatchObject({ isPrimary: false });
    db.close();
  });

  it('keeps a single primary account when a new one is set', async () => {
    const db = await createDb();
    const first = await insertAccount(db, {
      name: 'Banco',
      identifier: null,
      currency: 'EUR',
      initialBalance: 100,
      isPrimary: true,
    });
    const second = await insertAccount(db, {
      name: 'Efectivo',
      identifier: null,
      currency: 'EUR',
      initialBalance: 0,
      isPrimary: true,
    });

    expect(await getAccountById(db, first)).toMatchObject({ isPrimary: false });
    expect(await getAccountById(db, second)).toMatchObject({ isPrimary: true });
    db.close();
  });

  it('lists the primary account first and the rest alphabetically', async () => {
    const db = await createDb();
    await insertAccount(db, { name: 'Zeta', identifier: null, currency: 'EUR', initialBalance: 0 });
    await insertAccount(db, {
      name: 'Media',
      identifier: null,
      currency: 'EUR',
      initialBalance: 0,
      isPrimary: true,
    });
    await insertAccount(db, { name: 'Alfa', identifier: null, currency: 'EUR', initialBalance: 0 });

    const accounts = await listAccountsWithBalances(db);
    expect(accounts.map((account) => account.name)).toEqual(['Media', 'Alfa', 'Zeta']);
    db.close();
  });

  it('moves the primary flag to another account on update', async () => {
    const db = await createDb();
    const first = await insertAccount(db, {
      name: 'Banco',
      identifier: null,
      currency: 'EUR',
      initialBalance: 100,
      isPrimary: true,
    });
    const second = await insertAccount(db, { name: 'Efectivo', identifier: null, currency: 'EUR', initialBalance: 0 });

    await updateAccount(db, second, {
      name: 'Efectivo',
      identifier: null,
      currency: 'EUR',
      initialBalance: 0,
      isPrimary: true,
    });

    expect(await getAccountById(db, first)).toMatchObject({ isPrimary: false });
    expect(await getAccountById(db, second)).toMatchObject({ isPrimary: true });
    db.close();
  });

  it('promotes the next alphabetical account when the primary is deleted', async () => {
    const db = await createDb();
    const primary = await insertAccount(db, {
      name: 'Media',
      identifier: null,
      currency: 'EUR',
      initialBalance: 0,
      isPrimary: true,
    });
    const next = await insertAccount(db, { name: 'Alfa', identifier: null, currency: 'EUR', initialBalance: 0 });
    await insertAccount(db, { name: 'Zeta', identifier: null, currency: 'EUR', initialBalance: 0 });

    await deleteAccount(db, primary);

    expect(await getAccountById(db, next)).toMatchObject({ isPrimary: true });
    const accounts = await listAccountsWithBalances(db);
    expect(accounts.filter((account) => account.isPrimary)).toHaveLength(1);
    expect(accounts[0].name).toBe('Alfa');
    db.close();
  });

  it('keeps the primary when a non-primary account is deleted', async () => {
    const db = await createDb();
    const primary = await insertAccount(db, {
      name: 'Banco',
      identifier: null,
      currency: 'EUR',
      initialBalance: 100,
      isPrimary: true,
    });
    const other = await insertAccount(db, { name: 'Efectivo', identifier: null, currency: 'EUR', initialBalance: 0 });

    await deleteAccount(db, other);

    expect(await getAccountById(db, primary)).toMatchObject({ isPrimary: true });
    db.close();
  });

  it('calculates balance from income and expense transactions', async () => {
    const db = await createDb();
    const id = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 1000 });

    await db.runAsync(
      "INSERT INTO transactions (type, date, amount, currency, account_id) VALUES ('income', '2026-09-01', 500, 'EUR', ?)",
      [id],
    );
    await db.runAsync(
      "INSERT INTO transactions (type, date, amount, currency, account_id) VALUES ('expense', '2026-09-02', 200, 'EUR', ?)",
      [id],
    );

    const accounts = await listAccountsWithBalances(db);
    expect(accounts[0].balance).toBe(1300);
    db.close();
  });

  it('subtracts investments from the balance', async () => {
    const db = await createDb();
    const id = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 1000 });

    await db.runAsync(
      "INSERT INTO transactions (type, date, amount, currency, account_id) VALUES ('investment', '2026-09-01', 250, 'EUR', ?)",
      [id],
    );

    const accounts = await listAccountsWithBalances(db);
    expect(accounts[0].balance).toBe(750);
    db.close();
  });

  it('calculates transfer legs: origin subtracts, destination adds', async () => {
    const db = await createDb();
    const origin = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 100 });
    const destination = await insertAccount(db, {
      name: 'Efectivo',
      identifier: null,
      currency: 'EUR',
      initialBalance: 50,
    });

    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, destination_account_id, destination_amount)
       VALUES ('transfer', '2026-09-01', 30, 'EUR', ?, ?, 30)`,
      [origin, destination],
    );

    const accounts = await listAccountsWithBalances(db);
    const originAccount = accounts.find((a) => a.id === origin);
    const destinationAccount = accounts.find((a) => a.id === destination);
    expect(originAccount?.balance).toBe(70);
    expect(destinationAccount?.balance).toBe(80);
    db.close();
  });

  it('uses destination_amount for cross-currency transfer legs', async () => {
    const db = await createDb();
    const origin = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 100 });
    const destination = await insertAccount(db, {
      name: 'Dólares',
      identifier: null,
      currency: 'USD',
      initialBalance: 0,
    });

    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, destination_account_id, destination_amount, fx_rate)
       VALUES ('transfer', '2026-09-01', 100, 'EUR', ?, ?, 110, 1.1)`,
      [origin, destination],
    );

    const accounts = await listAccountsWithBalances(db);
    const originAccount = accounts.find((a) => a.id === origin);
    const destinationAccount = accounts.find((a) => a.id === destination);
    expect(originAccount?.balance).toBe(0);
    expect(destinationAccount?.balance).toBe(110);
    db.close();
  });

  it('falls back to amount when destination_amount is null', async () => {
    const db = await createDb();
    const origin = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 100 });
    const destination = await insertAccount(db, {
      name: 'Efectivo',
      identifier: null,
      currency: 'EUR',
      initialBalance: 50,
    });

    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, destination_account_id)
       VALUES ('transfer', '2026-09-01', 30, 'EUR', ?, ?)`,
      [origin, destination],
    );

    const accounts = await listAccountsWithBalances(db);
    const destinationAccount = accounts.find((a) => a.id === destination);
    expect(destinationAccount?.balance).toBe(80);
    db.close();
  });

  it('updates account fields', async () => {
    const db = await createDb();
    const id = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 100 });

    await updateAccount(db, id, { name: 'Banco nuevo', identifier: 'IBAN-1', currency: 'USD', initialBalance: 250 });

    const account = await getAccountById(db, id);
    expect(account).toMatchObject({
      id,
      name: 'Banco nuevo',
      identifier: 'IBAN-1',
      currency: 'USD',
      initialBalance: 250,
    });
    db.close();
  });

  it('returns null for a missing account', async () => {
    const db = await createDb();
    expect(await getAccountById(db, 999)).toBeNull();
    db.close();
  });

  it('deletes an account', async () => {
    const db = await createDb();
    const id = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 100 });

    await deleteAccount(db, id);

    expect(await getAccountById(db, id)).toBeNull();
    expect(await listAccountsWithBalances(db)).toHaveLength(0);
    db.close();
  });

  it('cascades deletion to associated transactions', async () => {
    const db = await createDb();
    const id = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 100 });
    await db.runAsync(
      "INSERT INTO transactions (type, date, amount, currency, account_id) VALUES ('expense', '2026-09-01', 10, 'EUR', ?)",
      [id],
    );

    await deleteAccount(db, id);

    const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM transactions');
    expect(count?.count).toBe(0);
    db.close();
  });

  it('counts transactions where the account is origin or destination', async () => {
    const db = await createDb();
    const origin = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 100 });
    const destination = await insertAccount(db, {
      name: 'Efectivo',
      identifier: null,
      currency: 'EUR',
      initialBalance: 50,
    });

    await db.runAsync(
      "INSERT INTO transactions (type, date, amount, currency, account_id) VALUES ('expense', '2026-09-01', 10, 'EUR', ?)",
      [origin],
    );
    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, destination_account_id)
       VALUES ('transfer', '2026-09-02', 20, 'EUR', ?, ?)`,
      [origin, destination],
    );

    expect(await countTransactionsForAccount(db, origin)).toBe(2);
    expect(await countTransactionsForAccount(db, destination)).toBe(1);
    db.close();
  });

  it('counts only active recurring rules for an account', async () => {
    const db = await createDb();
    const account = await insertAccount(db, { name: 'Banco', identifier: null, currency: 'EUR', initialBalance: 100 });
    const other = await insertAccount(db, { name: 'Efectivo', identifier: null, currency: 'EUR', initialBalance: 0 });

    await db.runAsync(
      `INSERT INTO recurring_rules (type, amount, currency, account_id, frequency, next_execution, active)
       VALUES ('expense', 10, 'EUR', ?, 'monthly', '2026-10-01', 1)`,
      [account],
    );
    await db.runAsync(
      `INSERT INTO recurring_rules (type, amount, currency, account_id, frequency, next_execution, active)
       VALUES ('expense', 10, 'EUR', ?, 'monthly', '2026-10-01', 0)`,
      [account],
    );
    await db.runAsync(
      `INSERT INTO recurring_rules (type, amount, currency, account_id, destination_account_id, frequency, next_execution, active)
       VALUES ('transfer', 10, 'EUR', ?, ?, 'monthly', '2026-10-01', 1)`,
      [other, account],
    );

    expect(await countActiveRecurringRulesForAccount(db, account)).toBe(2);
    db.close();
  });
});