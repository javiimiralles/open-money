import { migrate } from '@/db/client';
import {
  categoryNameExists,
  countActiveRecurringRulesForCategory,
  countTransactionsForCategory,
  deleteCategory,
  getCategoryById,
  insertCategory,
  updateCategory,
} from '@/db/repositories/categories-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

describe('categories-repo', () => {
  async function createDb() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    return db;
  }

  it('creates a category and returns it by id', async () => {
    const db = await createDb();
    const id = await insertCategory(db, { name: 'Caprichos', kind: 'expense' });
    expect(id).toBeGreaterThan(0);

    const category = await getCategoryById(db, id);
    expect(category).toMatchObject({ id, name: 'Caprichos', kind: 'expense' });
    db.close();
  });

  it('returns null for a missing category', async () => {
    const db = await createDb();
    expect(await getCategoryById(db, 999)).toBeNull();
    db.close();
  });

  it('updates category name and kind', async () => {
    const db = await createDb();
    const id = await insertCategory(db, { name: 'Caprichos', kind: 'expense' });

    await updateCategory(db, id, { name: 'Dividendos', kind: 'income' });

    expect(await getCategoryById(db, id)).toMatchObject({ id, name: 'Dividendos', kind: 'income' });
    db.close();
  });

  it('deletes a category', async () => {
    const db = await createDb();
    const id = await insertCategory(db, { name: 'Caprichos', kind: 'expense' });

    await deleteCategory(db, id);

    expect(await getCategoryById(db, id)).toBeNull();
    db.close();
  });

  it('sets transactions to NULL (uncategorized) when their category is deleted', async () => {
    const db = await createDb();
    const id = await insertCategory(db, { name: 'Ocio', kind: 'expense' });
    await db.runAsync(
      `INSERT INTO accounts (name, currency, initial_balance) VALUES ('Banco', 'EUR', 100)`,
    );
    const account = await db.getFirstAsync<{ id: number }>('SELECT id FROM accounts');
    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, category_id)
       VALUES ('expense', '2026-09-01', 10, 'EUR', ?, ?)`,
      [account?.id, id],
    );

    await deleteCategory(db, id);

    const transaction = await db.getFirstAsync<{ category_id: number | null }>(
      'SELECT category_id FROM transactions',
    );
    expect(transaction?.category_id).toBeNull();
    db.close();
  });

  it('sets recurring rules to NULL when their category is deleted', async () => {
    const db = await createDb();
    const id = await insertCategory(db, { name: 'Ocio', kind: 'expense' });
    await db.runAsync(`INSERT INTO accounts (name, currency, initial_balance) VALUES ('Banco', 'EUR', 100)`);
    const account = await db.getFirstAsync<{ id: number }>('SELECT id FROM accounts');
    await db.runAsync(
      `INSERT INTO recurring_rules (type, amount, currency, account_id, category_id, frequency, next_execution, active)
       VALUES ('expense', 10, 'EUR', ?, ?, 'monthly', '2026-10-01', 1)`,
      [account?.id, id],
    );

    await deleteCategory(db, id);

    const rule = await db.getFirstAsync<{ category_id: number | null }>('SELECT category_id FROM recurring_rules');
    expect(rule?.category_id).toBeNull();
    db.close();
  });

  it('counts transactions using a category', async () => {
    const db = await createDb();
    const used = await insertCategory(db, { name: 'Ocio', kind: 'expense' });
    const unused = await insertCategory(db, { name: 'Otros', kind: 'expense' });
    await db.runAsync(`INSERT INTO accounts (name, currency, initial_balance) VALUES ('Banco', 'EUR', 100)`);
    const account = await db.getFirstAsync<{ id: number }>('SELECT id FROM accounts');
    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, category_id)
       VALUES ('expense', '2026-09-01', 10, 'EUR', ?, ?)`,
      [account?.id, used],
    );

    expect(await countTransactionsForCategory(db, used)).toBe(1);
    expect(await countTransactionsForCategory(db, unused)).toBe(0);
    db.close();
  });

  it('counts only active recurring rules for a category', async () => {
    const db = await createDb();
    const id = await insertCategory(db, { name: 'Ocio', kind: 'expense' });
    await db.runAsync(`INSERT INTO accounts (name, currency, initial_balance) VALUES ('Banco', 'EUR', 100)`);
    const account = await db.getFirstAsync<{ id: number }>('SELECT id FROM accounts');
    await db.runAsync(
      `INSERT INTO recurring_rules (type, amount, currency, account_id, category_id, frequency, next_execution, active)
       VALUES ('expense', 10, 'EUR', ?, ?, 'monthly', '2026-10-01', 1)`,
      [account?.id, id],
    );
    await db.runAsync(
      `INSERT INTO recurring_rules (type, amount, currency, account_id, category_id, frequency, next_execution, active)
       VALUES ('expense', 10, 'EUR', ?, ?, 'monthly', '2026-10-01', 0)`,
      [account?.id, id],
    );

    expect(await countActiveRecurringRulesForCategory(db, id)).toBe(1);
    db.close();
  });

  it('detects duplicate names within the same kind, case-insensitively', async () => {
    const db = await createDb();
    const id = await insertCategory(db, { name: 'Caprichos', kind: 'expense' });

    expect(await categoryNameExists(db, 'caprichos', 'expense')).toBe(true);
    expect(await categoryNameExists(db, 'Caprichos', 'income')).toBe(false);
    expect(await categoryNameExists(db, 'Caprichos', 'expense', id)).toBe(false);
    db.close();
  });
});
