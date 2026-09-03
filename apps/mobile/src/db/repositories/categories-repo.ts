/**
 * Categories repository.
 */

import type { SqlExecutor } from '../client';

export type CategoryKind = 'income' | 'expense';

export interface Category {
  id: number;
  name: string;
  kind: CategoryKind;
}

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
}

export async function getAllCategories(db: SqlExecutor): Promise<Category[]> {
  return db.getAllAsync<Category>('SELECT id, name, kind FROM categories ORDER BY kind, name');
}

export async function getCategoryById(db: SqlExecutor, id: number): Promise<Category | null> {
  const row = await db.getFirstAsync<Category>('SELECT id, name, kind FROM categories WHERE id = ?', [id]);
  return row ?? null;
}

export async function insertCategory(db: SqlExecutor, input: CategoryInput): Promise<number> {
  await db.runAsync('INSERT INTO categories (name, kind) VALUES (?, ?)', [input.name, input.kind]);
  const row = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row?.id ?? 0;
}

export async function updateCategory(db: SqlExecutor, id: number, input: CategoryInput): Promise<void> {
  await db.runAsync('UPDATE categories SET name = ?, kind = ? WHERE id = ?', [input.name, input.kind, id]);
}

/**
 * Deletes a category. Transactions and recurring rules referencing it are set
 * to NULL (uncategorized) by the ON DELETE SET NULL foreign keys, provided
 * PRAGMA foreign_keys = ON (enabled by migrate()).
 */
export async function deleteCategory(db: SqlExecutor, id: number): Promise<void> {
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function categoryNameExists(
  db: SqlExecutor,
  name: string,
  kind: CategoryKind,
  excludeId?: number,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM categories
     WHERE kind = ? AND name = ? COLLATE NOCASE${excludeId !== undefined ? ' AND id != ?' : ''}`,
    excludeId !== undefined ? [kind, name, excludeId] : [kind, name],
  );
  return (row?.count ?? 0) > 0;
}

export async function countCategories(db: SqlExecutor): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories');
  return row?.count ?? 0;
}

export async function countCategoriesByKind(db: SqlExecutor, kind: CategoryKind): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories WHERE kind = ?', [kind]);
  return row?.count ?? 0;
}

export async function countTransactionsForCategory(db: SqlExecutor, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM transactions WHERE category_id = ?',
    [id],
  );
  return row?.count ?? 0;
}

export async function countActiveRecurringRulesForCategory(db: SqlExecutor, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM recurring_rules WHERE active = 1 AND category_id = ?',
    [id],
  );
  return row?.count ?? 0;
}