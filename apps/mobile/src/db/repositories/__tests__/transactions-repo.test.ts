import { migrate } from '@/db/client';
import { insertAccount, listAccountsWithBalances } from '@/db/repositories/accounts-repo';
import {
  deleteTransaction,
  getTransactionById,
  insertTransaction,
  listTransactions,
  updateTransaction,
  type TransactionInput,
} from '@/db/repositories/transactions-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

describe('transactions-repo', () => {
  async function createDb() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    return db;
  }

  async function createAccount(db: BetterSqliteExecutor, name = 'Banco', currency = 'EUR', initialBalance = 100) {
    return insertAccount(db, { name, identifier: null, currency, initialBalance });
  }

  function input(overrides: Partial<TransactionInput> = {}): TransactionInput {
    return {
      type: 'expense',
      date: '2026-09-01',
      amount: 25,
      currency: 'EUR',
      accountId: 1,
      categoryId: null,
      notes: null,
      ...overrides,
    };
  }

  it('inserts an income transaction and increases the account balance', async () => {
    const db = await createDb();
    const accountId = await createAccount(db, 'Banco', 'EUR', 100);

    const id = await insertTransaction(db, input({ type: 'income', amount: 50, accountId }));

    expect(id).toBeGreaterThan(0);
    const accounts = await listAccountsWithBalances(db);
    expect(accounts[0].balance).toBe(150);
    db.close();
  });

  it('inserts an expense transaction and decreases the account balance', async () => {
    const db = await createDb();
    const accountId = await createAccount(db, 'Banco', 'EUR', 100);

    await insertTransaction(db, input({ amount: 30, accountId }));

    const accounts = await listAccountsWithBalances(db);
    expect(accounts[0].balance).toBe(70);
    db.close();
  });

  it('updates a transaction and recalculates the balance', async () => {
    const db = await createDb();
    const accountId = await createAccount(db, 'Banco', 'EUR', 100);
    const id = await insertTransaction(db, input({ amount: 30, accountId }));

    await updateTransaction(db, id, input({ type: 'income', amount: 200, accountId }));

    const transaction = await getTransactionById(db, id);
    expect(transaction).toMatchObject({ id, type: 'income', amount: 200 });
    const accounts = await listAccountsWithBalances(db);
    expect(accounts[0].balance).toBe(300);
    db.close();
  });

  it('deletes a transaction and reverts the balance', async () => {
    const db = await createDb();
    const accountId = await createAccount(db, 'Banco', 'EUR', 100);
    const id = await insertTransaction(db, input({ amount: 30, accountId }));

    await deleteTransaction(db, id);

    expect(await getTransactionById(db, id)).toBeNull();
    const accounts = await listAccountsWithBalances(db);
    expect(accounts[0].balance).toBe(100);
    db.close();
  });

  it('returns transaction details with account and category names', async () => {
    const db = await createDb();
    const accountId = await createAccount(db, 'Banco', 'EUR', 100);
    await db.runAsync("INSERT INTO categories (name, kind) VALUES ('Comida', 'expense')");
    const categoryRow = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM categories WHERE name = 'Comida'",
    );

    const id = await insertTransaction(db, input({ accountId, categoryId: categoryRow?.id ?? null, notes: 'Almuerzo' }));

    const transaction = await getTransactionById(db, id);
    expect(transaction).toMatchObject({
      id,
      accountName: 'Banco',
      categoryName: 'Comida',
      notes: 'Almuerzo',
    });
    db.close();
  });

  it('returns null category name when the transaction has no category', async () => {
    const db = await createDb();
    const accountId = await createAccount(db, 'Banco', 'EUR', 100);
    const id = await insertTransaction(db, input({ accountId }));

    const transaction = await getTransactionById(db, id);
    expect(transaction?.categoryName).toBeNull();
    db.close();
  });

  it('lists transactions newest first', async () => {
    const db = await createDb();
    const accountId = await createAccount(db, 'Banco', 'EUR', 100);
    const older = await insertTransaction(db, input({ date: '2026-08-01', amount: 10, accountId }));
    const newer = await insertTransaction(db, input({ date: '2026-09-01', amount: 20, accountId }));

    const transactions = await listTransactions(db);
    expect(transactions.map((t) => t.id)).toEqual([newer, older]);
    db.close();
  });

  it('respects the limit parameter', async () => {
    const db = await createDb();
    const accountId = await createAccount(db, 'Banco', 'EUR', 100);
    await insertTransaction(db, input({ date: '2026-08-01', amount: 10, accountId }));
    await insertTransaction(db, input({ date: '2026-09-01', amount: 20, accountId }));

    const transactions = await listTransactions(db, 1);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(20);
    db.close();
  });

  it('returns null for a missing transaction', async () => {
    const db = await createDb();
    expect(await getTransactionById(db, 999)).toBeNull();
    db.close();
  });
});