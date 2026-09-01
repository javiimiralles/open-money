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

export async function getAllCategories(db: SqlExecutor): Promise<Category[]> {
  return db.getAllAsync<Category>('SELECT id, name, kind FROM categories ORDER BY kind, name');
}

export async function countCategories(db: SqlExecutor): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories');
  return row?.count ?? 0;
}

export async function countCategoriesByKind(db: SqlExecutor, kind: CategoryKind): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories WHERE kind = ?', [kind]);
  return row?.count ?? 0;
}