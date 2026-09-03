import { migrate } from '@/db/client';
import { insertAccount, listAccountsWithBalances } from '@/db/repositories/accounts-repo';
import { dumpAllTables, replaceAllTables } from '@/db/repositories/backup-repo';
import { insertCategory } from '@/db/repositories/categories-repo';
import { insertTransaction, listTransactions } from '@/db/repositories/transactions-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';
import { BackupValidationError } from '@/utils/backup';

describe('backup-repo', () => {
  async function createSeededDb() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    const accountId = await insertAccount(db, {
      name: 'Cash',
      identifier: null,
      currency: 'EUR',
      initialBalance: 100,
    });
    const categoryId = await insertCategory(db, { name: 'Backup food', kind: 'expense' });
    await insertTransaction(db, {
      type: 'expense',
      date: '2026-02-01',
      amount: 12.5,
      currency: 'EUR',
      accountId,
      categoryId,
      notes: 'Lunch',
    });
    return { db, accountId, categoryId };
  }

  it('dumps all tables with the current schema version', async () => {
    const { db } = await createSeededDb();
    const file = await dumpAllTables(db);

    expect(file.app).toBe('open-money');
    expect(file.schemaVersion).toBe(5);
    expect(file.data.accounts).toHaveLength(1);
    expect(file.data.transactions).toHaveLength(1);
    expect(file.data.categories.length).toBeGreaterThan(1);
    expect(file.data.settings).toEqual([]);
    db.close();
  });

  it('restores dumped data after local changes', async () => {
    const { db, accountId } = await createSeededDb();
    const file = await dumpAllTables(db);

    await db.runAsync('DELETE FROM transactions');
    await db.runAsync('UPDATE accounts SET name = ? WHERE id = ?', ['Changed', accountId]);
    expect(await listTransactions(db)).toHaveLength(0);

    await replaceAllTables(db, file);

    const transactions = await listTransactions(db);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].notes).toBe('Lunch');
    const accounts = await listAccountsWithBalances(db);
    expect(accounts[0].name).toBe('Cash');
    expect(accounts[0].balance).toBe(87.5);
    db.close();
  });

  it('keeps autoincrement sequences consistent after import', async () => {
    const { db } = await createSeededDb();
    const file = await dumpAllTables(db);

    await replaceAllTables(db, file);
    const nextId = await insertAccount(db, {
      name: 'Second',
      identifier: null,
      currency: 'EUR',
      initialBalance: 0,
    });
    expect(nextId).toBeGreaterThan(1);
    db.close();
  });

  it('rejects invalid backups without modifying data', async () => {
    const { db } = await createSeededDb();
    const file = await dumpAllTables(db);
    const tampered = {
      ...file,
      data: {
        ...file.data,
        transactions: [{ ...file.data.transactions[0], account_id: 999 }],
      },
    };

    await expect(replaceAllTables(db, tampered)).rejects.toBeInstanceOf(BackupValidationError);
    expect(await listTransactions(db)).toHaveLength(1);
    db.close();
  });
});
