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
  destinationAccountId: number | null;
  destinationAmount: number | null;
  fxRate: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionWithDetails extends Transaction {
  accountName: string;
  categoryName: string | null;
  destinationAccountName: string | null;
  destinationCurrency: string | null;
}

export interface IncomeExpenseInput {
  type: 'income' | 'expense';
  date: string;
  amount: number;
  currency: string;
  accountId: number;
  categoryId: number | null;
  notes: string | null;
}

export interface TransferInput {
  type: 'transfer';
  date: string;
  amount: number;
  currency: string;
  accountId: number;
  destinationAccountId: number;
  destinationAmount: number;
  fxRate: number | null;
  notes: string | null;
}

export type TransactionInput = IncomeExpenseInput | TransferInput;

export interface TransactionFilters {
  type: TransactionType | 'all';
  accountId: number | null;
  categoryId: number | null;
  fromDate: string | null;
  toDate: string | null;
  search: string | null;
}

export const EMPTY_TRANSACTION_FILTERS: TransactionFilters = {
  type: 'all',
  accountId: null,
  categoryId: null,
  fromDate: null,
  toDate: null,
  search: null,
};

interface TransactionRow {
  id: number;
  type: TransactionType;
  date: string;
  amount: number;
  currency: string;
  account_id: number;
  category_id: number | null;
  notes: string | null;
  destination_account_id: number | null;
  destination_amount: number | null;
  fx_rate: number | null;
  created_at: string;
  updated_at: string;
}

interface TransactionDetailsRow extends TransactionRow {
  account_name: string;
  category_name: string | null;
  destination_account_name: string | null;
  destination_currency: string | null;
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
    destinationAccountId: row.destination_account_id,
    destinationAmount: row.destination_amount,
    fxRate: row.fx_rate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransactionWithDetails(row: TransactionDetailsRow): TransactionWithDetails {
  return {
    ...mapTransaction(row),
    accountName: row.account_name,
    categoryName: row.category_name,
    destinationAccountName: row.destination_account_name,
    destinationCurrency: row.destination_currency,
  };
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
    t.destination_account_id,
    t.destination_amount,
    t.fx_rate,
    t.created_at,
    t.updated_at,
    a.name AS account_name,
    c.name AS category_name,
    da.name AS destination_account_name,
    da.currency AS destination_currency
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN accounts da ON da.id = t.destination_account_id
`;

export async function insertTransaction(db: SqlExecutor, input: TransactionInput): Promise<number> {
  if (input.type === 'transfer') {
    await db.runAsync(
      `INSERT INTO transactions
         (type, date, amount, currency, account_id, category_id, notes, destination_account_id, destination_amount, fx_rate)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      [
        input.type,
        input.date,
        input.amount,
        input.currency,
        input.accountId,
        input.notes,
        input.destinationAccountId,
        input.destinationAmount,
        input.fxRate,
      ],
    );
  } else {
    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, category_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.type, input.date, input.amount, input.currency, input.accountId, input.categoryId, input.notes],
    );
  }
  const row = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row?.id ?? 0;
}

export async function updateTransaction(db: SqlExecutor, id: number, input: TransactionInput): Promise<void> {
  if (input.type === 'transfer') {
    await db.runAsync(
      `UPDATE transactions
       SET type = ?, date = ?, amount = ?, currency = ?, account_id = ?, category_id = NULL, notes = ?,
           destination_account_id = ?, destination_amount = ?, fx_rate = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.type,
        input.date,
        input.amount,
        input.currency,
        input.accountId,
        input.notes,
        input.destinationAccountId,
        input.destinationAmount,
        input.fxRate,
        id,
      ],
    );
  } else {
    await db.runAsync(
      `UPDATE transactions
       SET type = ?, date = ?, amount = ?, currency = ?, account_id = ?, category_id = ?, notes = ?,
           destination_account_id = NULL, destination_amount = NULL, fx_rate = NULL, updated_at = datetime('now')
       WHERE id = ?`,
      [input.type, input.date, input.amount, input.currency, input.accountId, input.categoryId, input.notes, id],
    );
  }
}

export async function deleteTransaction(db: SqlExecutor, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function getTransactionById(db: SqlExecutor, id: number): Promise<TransactionWithDetails | null> {
  const row = await db.getFirstAsync<TransactionDetailsRow>(`${DETAILS_SELECT} WHERE t.id = ?`, [id]);
  return row ? mapTransactionWithDetails(row) : null;
}

/**
 * Escapes LIKE wildcards so user input is matched literally.
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Builds a parameterized WHERE clause for the given filters.
 * Never interpolates user input into the SQL text.
 */
function buildFilters(filters: TransactionFilters): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.type !== 'all') {
    conditions.push('t.type = ?');
    params.push(filters.type);
  }
  if (filters.accountId !== null) {
    // A transfer involves two accounts: match either leg.
    conditions.push('(t.account_id = ? OR t.destination_account_id = ?)');
    params.push(filters.accountId, filters.accountId);
  }
  if (filters.categoryId !== null) {
    conditions.push('t.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.fromDate !== null) {
    conditions.push('t.date >= ?');
    params.push(filters.fromDate);
  }
  if (filters.toDate !== null) {
    conditions.push('t.date <= ?');
    params.push(filters.toDate);
  }
  if (filters.search !== null && filters.search.trim() !== '') {
    conditions.push(`t.notes LIKE ('%' || ? || '%') ESCAPE '\\'`);
    params.push(escapeLike(filters.search.trim()));
  }

  return { where: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '', params };
}

/**
 * Lists transactions matching the given filters in reverse chronological
 * order (newest first). All criteria are combined with AND.
 */
export async function listTransactionsFiltered(
  db: SqlExecutor,
  filters: TransactionFilters,
): Promise<TransactionWithDetails[]> {
  const { where, params } = buildFilters(filters);
  const rows = await db.getAllAsync<TransactionDetailsRow>(
    `${DETAILS_SELECT}${where} ORDER BY t.date DESC, t.id DESC`,
    params,
  );
  return rows.map(mapTransactionWithDetails);
}

/**
 * Lists transactions in reverse chronological order (newest first).
 * `limit` is optional; used by the dashboard for recent movements.
 */
export async function listTransactions(db: SqlExecutor, limit?: number): Promise<TransactionWithDetails[]> {
  const { where, params } = buildFilters(EMPTY_TRANSACTION_FILTERS);
  const rows = await db.getAllAsync<TransactionDetailsRow>(
    `${DETAILS_SELECT}${where} ORDER BY t.date DESC, t.id DESC${limit ? ' LIMIT ?' : ''}`,
    limit ? [...params, limit] : params,
  );
  return rows.map(mapTransactionWithDetails);
}