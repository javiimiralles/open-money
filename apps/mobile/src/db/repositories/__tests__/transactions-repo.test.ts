import { migrate } from '@/db/client';
import { insertAccount, listAccountsWithBalances } from '@/db/repositories/accounts-repo';
import {
  deleteTransaction,
  EMPTY_TRANSACTION_FILTERS,
  getTransactionById,
  insertTransaction,
  listTransactions,
  listTransactionsFiltered,
  updateTransaction,
  type IncomeExpenseInput,
  type TransactionInput,
  type TransferInput,
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

  function input(overrides: Partial<IncomeExpenseInput> = {}): TransactionInput {
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

  function transferInput(overrides: Partial<TransferInput> = {}): TransactionInput {
    return {
      type: 'transfer',
      date: '2026-09-01',
      amount: 100,
      currency: 'EUR',
      accountId: 1,
      destinationAccountId: 2,
      destinationAmount: 100,
      fxRate: null,
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

  it('inserts a transfer with destination details projected', async () => {
    const db = await createDb();
    const origin = await createAccount(db, 'Banco', 'EUR', 100);
    const destination = await createAccount(db, 'Dólares', 'USD', 0);

    const id = await insertTransaction(
      db,
      transferInput({
        accountId: origin,
        destinationAccountId: destination,
        amount: 100,
        destinationAmount: 110,
        fxRate: 1.1,
      }),
    );

    const transaction = await getTransactionById(db, id);
    expect(transaction).toMatchObject({
      id,
      type: 'transfer',
      amount: 100,
      accountId: origin,
      accountName: 'Banco',
      destinationAccountId: destination,
      destinationAccountName: 'Dólares',
      destinationAmount: 110,
      destinationCurrency: 'USD',
      fxRate: 1.1,
      categoryId: null,
    });
    db.close();
  });

  it('updates a transfer and recalculates both balances', async () => {
    const db = await createDb();
    const origin = await createAccount(db, 'Banco', 'EUR', 100);
    const destination = await createAccount(db, 'Efectivo', 'EUR', 50);
    const id = await insertTransaction(
      db,
      transferInput({ accountId: origin, destinationAccountId: destination, amount: 30, destinationAmount: 30 }),
    );

    await updateTransaction(
      db,
      id,
      transferInput({ accountId: origin, destinationAccountId: destination, amount: 60, destinationAmount: 60 }),
    );

    const transaction = await getTransactionById(db, id);
    expect(transaction).toMatchObject({ id, type: 'transfer', amount: 60, destinationAmount: 60 });
    const accounts = await listAccountsWithBalances(db);
    expect(accounts.find((a) => a.id === origin)?.balance).toBe(40);
    expect(accounts.find((a) => a.id === destination)?.balance).toBe(110);
    db.close();
  });

  it('deletes a transfer and reverts both legs', async () => {
    const db = await createDb();
    const origin = await createAccount(db, 'Banco', 'EUR', 100);
    const destination = await createAccount(db, 'Efectivo', 'EUR', 50);
    const id = await insertTransaction(
      db,
      transferInput({ accountId: origin, destinationAccountId: destination, amount: 30, destinationAmount: 30 }),
    );

    await deleteTransaction(db, id);

    expect(await getTransactionById(db, id)).toBeNull();
    const accounts = await listAccountsWithBalances(db);
    expect(accounts.find((a) => a.id === origin)?.balance).toBe(100);
    expect(accounts.find((a) => a.id === destination)?.balance).toBe(50);
    db.close();
  });

  it('applies cross-currency transfer legs via the repository', async () => {
    const db = await createDb();
    const origin = await createAccount(db, 'Banco', 'EUR', 100);
    const destination = await createAccount(db, 'Dólares', 'USD', 0);

    await insertTransaction(
      db,
      transferInput({
        accountId: origin,
        destinationAccountId: destination,
        amount: 100,
        destinationAmount: 110,
        fxRate: 1.1,
      }),
    );

    const accounts = await listAccountsWithBalances(db);
    expect(accounts.find((a) => a.id === origin)?.balance).toBe(0);
    expect(accounts.find((a) => a.id === destination)?.balance).toBe(110);
    db.close();
  });

  describe('listTransactionsFiltered', () => {
  async function seed() {
    const db = await createDb();
    const accountA = await createAccount(db, 'Banco', 'EUR', 0);
    const accountB = await createAccount(db, 'Efectivo', 'EUR', 0);
    await db.runAsync("INSERT INTO categories (name, kind) VALUES ('Comida', 'expense')");
    await db.runAsync("INSERT INTO categories (name, kind) VALUES ('Salario', 'income')");
    const comida = (await db.getFirstAsync<{ id: number }>("SELECT id FROM categories WHERE name = 'Comida'"))?.id ?? 0;
    const salario = (await db.getFirstAsync<{ id: number }>("SELECT id FROM categories WHERE name = 'Salario'"))?.id ?? 0;
    return { db, accountA, accountB, comida, salario };
  }

  it('returns all transactions with empty filters', async () => {
    const { db, accountA } = await seed();
    await insertTransaction(db, input({ date: '2026-09-01', amount: 10, accountId: accountA }));
    await insertTransaction(db, input({ date: '2026-08-01', amount: 20, accountId: accountA }));

    const rows = await listTransactionsFiltered(db, EMPTY_TRANSACTION_FILTERS);
    expect(rows).toHaveLength(2);
    db.close();
  });

  it('filters by type', async () => {
    const { db, accountA } = await seed();
    await insertTransaction(db, input({ type: 'income', amount: 100, accountId: accountA }));
    await insertTransaction(db, input({ type: 'expense', amount: 30, accountId: accountA }));

    const rows = await listTransactionsFiltered(db, { ...EMPTY_TRANSACTION_FILTERS, type: 'income' });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(100);
    db.close();
  });

  it('filters by account', async () => {
    const { db, accountA, accountB } = await seed();
    await insertTransaction(db, input({ amount: 10, accountId: accountA }));
    await insertTransaction(db, input({ amount: 20, accountId: accountB }));

    const rows = await listTransactionsFiltered(db, { ...EMPTY_TRANSACTION_FILTERS, accountId: accountB });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(20);
    db.close();
  });

  it('filters by account including the transfer destination', async () => {
    const { db, accountA, accountB } = await seed();
    await insertTransaction(
      db,
      transferInput({ accountId: accountA, destinationAccountId: accountB, amount: 30, destinationAmount: 30 }),
    );

    const byOrigin = await listTransactionsFiltered(db, { ...EMPTY_TRANSACTION_FILTERS, accountId: accountA });
    const byDestination = await listTransactionsFiltered(db, { ...EMPTY_TRANSACTION_FILTERS, accountId: accountB });
    expect(byOrigin).toHaveLength(1);
    expect(byDestination).toHaveLength(1);
    expect(byDestination[0].type).toBe('transfer');
    db.close();
  });

  it('filters by transfer type', async () => {
    const { db, accountA, accountB } = await seed();
    await insertTransaction(db, input({ type: 'income', amount: 100, accountId: accountA }));
    await insertTransaction(
      db,
      transferInput({ accountId: accountA, destinationAccountId: accountB, amount: 30, destinationAmount: 30 }),
    );

    const rows = await listTransactionsFiltered(db, { ...EMPTY_TRANSACTION_FILTERS, type: 'transfer' });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('transfer');
    db.close();
  });

  it('filters by category', async () => {
    const { db, accountA, comida, salario } = await seed();
    await insertTransaction(db, input({ amount: 10, accountId: accountA, categoryId: comida }));
    await insertTransaction(db, input({ amount: 20, accountId: accountA, categoryId: salario }));

    const rows = await listTransactionsFiltered(db, { ...EMPTY_TRANSACTION_FILTERS, categoryId: comida });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(10);
    db.close();
  });

  it('filters by date range (inclusive)', async () => {
    const { db, accountA } = await seed();
    await insertTransaction(db, input({ date: '2026-08-01', amount: 10, accountId: accountA }));
    await insertTransaction(db, input({ date: '2026-09-15', amount: 20, accountId: accountA }));
    await insertTransaction(db, input({ date: '2026-10-01', amount: 30, accountId: accountA }));

    const rows = await listTransactionsFiltered(db, {
      ...EMPTY_TRANSACTION_FILTERS,
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(20);
    db.close();
  });

  it('searches notes with a partial, case-insensitive match', async () => {
    const { db, accountA } = await seed();
    await insertTransaction(db, input({ amount: 10, accountId: accountA, notes: 'Supermercado semanal' }));
    await insertTransaction(db, input({ amount: 20, accountId: accountA, notes: 'Cine' }));

    const rows = await listTransactionsFiltered(db, { ...EMPTY_TRANSACTION_FILTERS, search: 'super' });
    expect(rows).toHaveLength(1);
    expect(rows[0].notes).toBe('Supermercado semanal');
    db.close();
  });

  it('treats LIKE wildcards in the search term literally', async () => {
    const { db, accountA } = await seed();
    await insertTransaction(db, input({ amount: 10, accountId: accountA, notes: 'Descuento 50%' }));
    await insertTransaction(db, input({ amount: 20, accountId: accountA, notes: 'Descuento 50X' }));

    const rows = await listTransactionsFiltered(db, { ...EMPTY_TRANSACTION_FILTERS, search: '50%' });
    expect(rows).toHaveLength(1);
    expect(rows[0].notes).toBe('Descuento 50%');
    db.close();
  });

  it('combines all criteria with AND', async () => {
    const { db, accountA, accountB, comida } = await seed();
    await insertTransaction(
      db,
      input({ date: '2026-09-10', amount: 10, accountId: accountA, categoryId: comida, notes: 'Mercadona' }),
    );
    await insertTransaction(
      db,
      input({ date: '2026-09-10', amount: 15, accountId: accountA, categoryId: comida, notes: 'Otro' }),
    );
    await insertTransaction(
      db,
      input({ date: '2026-09-10', amount: 20, accountId: accountB, categoryId: comida, notes: 'Mercadona' }),
    );

    const rows = await listTransactionsFiltered(db, {
      type: 'expense',
      accountId: accountA,
      categoryId: comida,
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
      search: 'Mercadona',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(10);
    db.close();
  });
  });
});