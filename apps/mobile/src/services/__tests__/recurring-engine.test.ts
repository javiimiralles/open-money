import { migrate } from '@/db/client';
import { insertAccount, listAccountsWithBalances } from '@/db/repositories/accounts-repo';
import { insertRecurringRule, deleteRecurringRule, getRecurringRuleById } from '@/db/repositories/recurring-rules-repo';
import { deleteTransactionsByBatch, listTransactions } from '@/db/repositories/transactions-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';
import {
  clearLastRecurringBatch,
  getLastRecurringBatch,
  loadActiveRecurringBatch,
  processRecurringOnOpen,
  undoLastRecurringBatch,
} from '@/services/recurring-engine';

describe('recurring-engine', () => {
  async function createDb() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    return db;
  }

  async function createAccount(db: BetterSqliteExecutor, name = 'Banco', currency = 'EUR', initialBalance = 100) {
    return insertAccount(db, { name, identifier: null, currency, initialBalance });
  }

  it('processes overdue rules with catch-up and advances next_execution', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, {
      type: 'expense',
      amount: 20,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: 'Alquiler',
      frequency: 'weekly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: null,
    });

    const result = await processRecurringOnOpen(db, '2026-09-15');
    expect(result).not.toBeNull();
    expect(result?.appliedCount).toBe(3); // Sep 1, 8, 15

    const transactions = await listTransactions(db);
    expect(transactions).toHaveLength(3);
    expect(transactions.every((t) => t.source === 'recurring')).toBe(true);
    expect(transactions.every((t) => t.recurringBatchId === result?.batchId)).toBe(true);

    const rule = await getRecurringRuleById(db, 1);
    expect(rule?.nextExecution).toBe('2026-09-22');
    expect(rule?.lastRunDate).toBe('2026-09-15');
    db.close();
  });

  it('is idempotent: second run with same asOf produces no new transactions', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, {
      type: 'expense',
      amount: 10,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: null,
      frequency: 'weekly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: null,
    });

    await processRecurringOnOpen(db, '2026-09-08');
    const second = await processRecurringOnOpen(db, '2026-09-08');
    expect(second).toBeNull();
    const transactions = await listTransactions(db);
    expect(transactions).toHaveLength(2); // Sep 1, Sep 8
    db.close();
  });

  it('supports monthly catch-up with end-of-month clamp', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, {
      type: 'expense',
      amount: 30,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: null,
      frequency: 'monthly',
      intervalDays: null,
      nextExecution: '2026-01-31',
      active: true,
      fxRate: null,
    });

    await processRecurringOnOpen(db, '2026-03-31');
    const transactions = await listTransactions(db);
    // Jan 31, Feb 28, Mar 28
    expect(transactions.map((t) => t.date).sort()).toEqual(['2026-01-31', '2026-02-28', '2026-03-28']);
    db.close();
  });

  it('handles transfer rules with fx_rate', async () => {
    const db = await createDb();
    const origin = await createAccount(db, 'Banco', 'EUR', 200);
    const dest = await createAccount(db, 'Dólares', 'USD', 0);
    await insertRecurringRule(db, {
      type: 'transfer',
      amount: 100,
      currency: 'EUR',
      accountId: origin,
      destinationAccountId: dest,
      categoryId: null,
      instrumentId: null,
      notes: null,
      frequency: 'weekly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: 1.1,
    });

    await processRecurringOnOpen(db, '2026-09-01');
    const tx = (await listTransactions(db))[0];
    expect(tx.type).toBe('transfer');
    expect(tx.destinationAmount).toBe(110);
    expect(tx.fxRate).toBe(1.1);

    const accounts = await listAccountsWithBalances(db);
    expect(accounts.find((a) => a.id === origin)?.balance).toBe(100);
    expect(accounts.find((a) => a.id === dest)?.balance).toBe(110);
    db.close();
  });

  it('stores a batch snapshot and undo restores rules and deletes transactions', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, {
      type: 'expense',
      amount: 10,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: null,
      frequency: 'weekly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: null,
    });

    const result = await processRecurringOnOpen(db, '2026-09-08');
    expect(result?.appliedCount).toBe(2);
    const batch = await getLastRecurringBatch(db);
    expect(batch?.count).toBe(2);
    expect(batch?.batchId).toBe(result?.batchId);

    const undone = await undoLastRecurringBatch(db);
    expect(undone).toBeGreaterThan(0);
    expect(await listTransactions(db)).toHaveLength(0);
    const rule = await getRecurringRuleById(db, 1);
    expect(rule?.nextExecution).toBe('2026-09-01');
    expect(rule?.lastRunDate).toBeNull();
    expect(await getLastRecurringBatch(db)).toBeNull();
    db.close();
  });

  it('does not process paused rules', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, {
      type: 'expense',
      amount: 10,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: null,
      frequency: 'weekly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: false,
      fxRate: null,
    });

    const result = await processRecurringOnOpen(db, '2026-09-15');
    expect(result).toBeNull();
    expect(await listTransactions(db)).toHaveLength(0);
    db.close();
  });

  it('every_n_days catch-up', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, {
      type: 'income',
      amount: 5,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: null,
      frequency: 'every_n_days',
      intervalDays: 3,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: null,
    });

    await processRecurringOnOpen(db, '2026-09-07');
    const transactions = await listTransactions(db);
    expect(transactions.map((t) => t.date).sort()).toEqual(['2026-09-01', '2026-09-04', '2026-09-07']);
    db.close();
  });

  it('loadActiveRecurringBatch returns the stored batch while its transactions exist', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, {
      type: 'expense',
      amount: 10,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: null,
      frequency: 'weekly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: null,
    });

    const result = await processRecurringOnOpen(db, '2026-09-08');
    const batch = await loadActiveRecurringBatch(db);
    expect(batch?.batchId).toBe(result?.batchId);
    expect(batch?.count).toBe(2);
    db.close();
  });

  it('dismissed batch never resurfaces: clear + reopen shows no notice', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, {
      type: 'expense',
      amount: 10,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: null,
      frequency: 'weekly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: null,
    });

    await processRecurringOnOpen(db, '2026-09-08');
    await clearLastRecurringBatch(db);

    // Simulates reopening the app: no persisted notice and no new batch
    expect(await loadActiveRecurringBatch(db)).toBeNull();
    expect(await processRecurringOnOpen(db, '2026-09-08')).toBeNull();
    expect(await loadActiveRecurringBatch(db)).toBeNull();
    db.close();
  });

  it('loadActiveRecurringBatch clears a stale batch whose transactions were deleted', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, {
      type: 'expense',
      amount: 10,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: null,
      frequency: 'weekly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: null,
    });

    const result = await processRecurringOnOpen(db, '2026-09-08');
    expect(result).not.toBeNull();
    await deleteTransactionsByBatch(db, result!.batchId);

    expect(await loadActiveRecurringBatch(db)).toBeNull();
    expect(await getLastRecurringBatch(db)).toBeNull();
    db.close();
  });

  it('undo still works after the rule was deleted', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    const ruleId = await insertRecurringRule(db, {
      type: 'expense',
      amount: 10,
      currency: 'EUR',
      accountId,
      destinationAccountId: null,
      categoryId: null,
      notes: null,
      frequency: 'weekly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: null,
    });

    await processRecurringOnOpen(db, '2026-09-08');
    await deleteRecurringRule(db, ruleId);

    const undone = await undoLastRecurringBatch(db);
    expect(undone).toBeGreaterThan(0);
    expect(await listTransactions(db)).toHaveLength(0);
    expect(await loadActiveRecurringBatch(db)).toBeNull();
    db.close();
  });
});
