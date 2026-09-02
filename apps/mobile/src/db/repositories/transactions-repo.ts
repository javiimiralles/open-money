/**
 * Transactions repository: CRUD for income/expense movements.
 *
 * Balances are derived on read by `listAccountsWithBalances`, so inserting,
 * updating, or deleting a transaction automatically updates account balances.
 */

import type { SqlExecutor } from '../client';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: number;
  type: TransactionType;
  date: string;
  amount: number;
  currency: string;
  accountId: number;
  categoryId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionWithDetails extends Transaction {
  accountName: string;
  categoryName: string | null;
}

export interface TransactionInput {
  type: 'income' | 'expense';
  date: string;
  amount: number;
  currency: string;
  accountId: number;
  categoryId: number | null;
  notes: string | null;
}

interface TransactionRow {
  id: number;
  type: TransactionType;
  date: string;
  amount: number;
  currency: string;
  account_id: number;
  category_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TransactionDetailsRow extends TransactionRow {
  account_name: string;
  category_name: string | null;
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    date: row.date,
    amount: row.amount,
    currency: row.currency,
    accountId: row.account_id,
    categoryId: row.category_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransactionWithDetails(row: TransactionDetailsRow): TransactionWithDetails {
  return { ...mapTransaction(row), accountName: row.account_name, categoryName: row.category_name };
}

const DETAILS_SELECT = `
  SELECT
    t.id,
    t.type,
    t.date,
    t.amount,
    t.currency,
    t.account_id,
    t.category_id,
    t.notes,
    t.created_at,
    t.updated_at,
    a.name AS account_name,
    c.name AS category_name
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  LEFT JOIN categories c ON c.id = t.category_id
`;

export async function insertTransaction(db: SqlExecutor, input: TransactionInput): Promise<number> {
  await db.runAsync(
    `INSERT INTO transactions (type, date, amount, currency, account_id, category_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.type, input.date, input.amount, input.currency, input.accountId, input.categoryId, input.notes],
  );
  const row = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row?.id ?? 0;
}

export async function updateTransaction(db: SqlExecutor, id: number, input: TransactionInput): Promise<void> {
  await db.runAsync(
    `UPDATE transactions
     SET type = ?, date = ?, amount = ?, currency = ?, account_id = ?, category_id = ?, notes = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [input.type, input.date, input.amount, input.currency, input.accountId, input.categoryId, input.notes, id],
  );
}

export async function deleteTransaction(db: SqlExecutor, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function getTransactionById(db: SqlExecutor, id: number): Promise<TransactionWithDetails | null> {
  const row = await db.getFirstAsync<TransactionDetailsRow>(`${DETAILS_SELECT} WHERE t.id = ?`, [id]);
  return row ? mapTransactionWithDetails(row) : null;
}

/**
 * Lists transactions in reverse chronological order (newest first).
 * `limit` is optional; US-004 will extend this with filter parameters.
 */
export async function listTransactions(db: SqlExecutor, limit?: number): Promise<TransactionWithDetails[]> {
  const rows = await db.getAllAsync<TransactionDetailsRow>(
    `${DETAILS_SELECT} ORDER BY t.date DESC, t.id DESC${limit ? ' LIMIT ?' : ''}`,
    limit ? [limit] : [],
  );
  return rows.map(mapTransactionWithDetails);
}