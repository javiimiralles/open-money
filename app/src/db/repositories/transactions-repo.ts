/**
 * Transactions repository: CRUD for income/expense/investment movements.
 *
 * Balances are derived on read by `listAccountsWithBalances`, so inserting,
 * updating, or deleting a transaction automatically updates account balances.
 */

import type { SqlExecutor } from '../client';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';

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
  source: 'manual' | 'recurring';
  recurringRuleId: number | null;
  recurringBatchId: string | null;
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
  type: 'income' | 'expense' | 'investment';
  date: string;
  amount: number;
  currency: string;
  accountId: number;
  categoryId: number | null;
  notes: string | null;
  source?: 'manual' | 'recurring';
  recurringRuleId?: number | null;
  recurringBatchId?: string | null;
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
  source?: 'manual' | 'recurring';
  recurringRuleId?: number | null;
  recurringBatchId?: string | null;
}

export type TransactionInput = IncomeExpenseInput | TransferInput;

/**
 * Defense-in-depth guard: a transfer must move money between two accounts.
 * The form validates this too; the repository rejects invalid callers.
 */
function assertValidTransfer(input: TransferInput): void {
  if (input.destinationAccountId === input.accountId) {
    throw new Error('Transfer origin and destination must be different accounts.');
  }
}

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
  source: 'manual' | 'recurring';
  recurring_rule_id: number | null;
  recurring_batch_id: string | null;
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
    source: row.source ?? 'manual',
    recurringRuleId: row.recurring_rule_id ?? null,
    recurringBatchId: row.recurring_batch_id ?? null,
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
    t.source,
    t.recurring_rule_id,
    t.recurring_batch_id,
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
  const source = input.source ?? 'manual';
  const recurringRuleId = input.recurringRuleId ?? null;
  const recurringBatchId = input.recurringBatchId ?? null;
  if (input.type === 'transfer') {
    assertValidTransfer(input);
    await db.runAsync(
      `INSERT INTO transactions
         (type, date, amount, currency, account_id, category_id, notes, destination_account_id, destination_amount, fx_rate, source, recurring_rule_id, recurring_batch_id)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
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
        source,
        recurringRuleId,
        recurringBatchId,
      ],
    );
  } else {
    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, category_id, notes, source, recurring_rule_id, recurring_batch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.type,
        input.date,
        input.amount,
        input.currency,
        input.accountId,
        input.categoryId,
        input.notes,
        source,
        recurringRuleId,
        recurringBatchId,
      ],
    );
  }
  const row = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row?.id ?? 0;
}

export async function updateTransaction(db: SqlExecutor, id: number, input: TransactionInput): Promise<void> {
  if (input.type === 'transfer') {
    assertValidTransfer(input);
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

export async function deleteTransactionsByBatch(db: SqlExecutor, batchId: string): Promise<number> {
  const result = (await db.runAsync('DELETE FROM transactions WHERE recurring_batch_id = ?', [batchId])) as {
    changes?: number;
  };
  return result?.changes ?? 0;
}

export async function countTransactionsByBatch(db: SqlExecutor, batchId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM transactions WHERE recurring_batch_id = ?',
    [batchId],
  );
  return row?.count ?? 0;
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
 * Pagination options for transaction listing.
 * `offset` rows are skipped before returning up to `limit` rows.
 */
export interface TransactionPagination {
  limit?: number;
  offset?: number;
}

/**
 * Lists transactions matching the given filters in reverse chronological
 * order (newest first). All criteria are combined with AND.
 * Supports `LIMIT`/`OFFSET` pagination for infinite scroll.
 */
export async function listTransactionsFiltered(
  db: SqlExecutor,
  filters: TransactionFilters,
  pagination?: TransactionPagination,
): Promise<TransactionWithDetails[]> {
  const { where, params } = buildFilters(filters);
  const queryParams = [...params];
  let paginationClause = '';
  if (pagination?.limit !== undefined) {
    paginationClause += ' LIMIT ?';
    queryParams.push(pagination.limit);
  }
  if (pagination?.offset !== undefined) {
    if (pagination.limit === undefined) {
      paginationClause += ' LIMIT -1';
    }
    paginationClause += ' OFFSET ?';
    queryParams.push(pagination.offset);
  }
  const rows = await db.getAllAsync<TransactionDetailsRow>(
    `${DETAILS_SELECT}${where} ORDER BY t.date DESC, t.id DESC${paginationClause}`,
    queryParams,
  );
  return rows.map(mapTransactionWithDetails);
}

/**
 * Counts transactions matching the given filters without loading rows.
 * Used to size infinite-scroll lists and summaries.
 */
export async function countTransactionsFiltered(db: SqlExecutor, filters: TransactionFilters): Promise<number> {
  const { where, params } = buildFilters(filters);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM transactions t${where}`,
    params,
  );
  return row?.count ?? 0;
}

interface FilteredSummaryRow {
  type: TransactionType;
  currency: string;
  total: number;
  count: number;
}

/**
 * Summarizes all transactions matching the given filters without loading
 * rows: total count, signed net, and currency (null when mixed or empty).
 * Transfers count toward `count` but are neutral in `net`.
 */
export async function summarizeTransactionsFiltered(
  db: SqlExecutor,
  filters: TransactionFilters,
): Promise<{ count: number; net: number; currency: string | null; mixedCurrencies: boolean }> {
  const { where, params } = buildFilters(filters);
  const rows = await db.getAllAsync<FilteredSummaryRow>(
    `SELECT t.type AS type, t.currency AS currency, SUM(t.amount) AS total, COUNT(*) AS count
     FROM transactions t${where}
     GROUP BY t.type, t.currency`,
    params,
  );
  let count = 0;
  let net = 0;
  const currencies = new Set<string>();
  for (const row of rows) {
    count += row.count;
    currencies.add(row.currency);
    if (row.type === 'income') {
      net += row.total;
    } else if (row.type === 'expense' || row.type === 'investment') {
      net -= row.total;
    }
  }
  const mixedCurrencies = currencies.size > 1;
  return {
    count,
    net,
    currency: mixedCurrencies || currencies.size === 0 ? null : [...currencies][0],
    mixedCurrencies,
  };
}

/**
 * Lists transactions in reverse chronological order (newest first).
 * `limit`/`offset` are optional; `limit` is used by the dashboard for
 * recent movements and `offset` enables pagination.
 */
export async function listTransactions(
  db: SqlExecutor,
  limit?: number,
  offset?: number,
): Promise<TransactionWithDetails[]> {
  const { where, params } = buildFilters(EMPTY_TRANSACTION_FILTERS);
  const queryParams = [...params];
  let paginationClause = '';
  if (limit !== undefined) {
    paginationClause += ' LIMIT ?';
    queryParams.push(limit);
  }
  if (offset !== undefined) {
    if (limit === undefined) {
      paginationClause += ' LIMIT -1';
    }
    paginationClause += ' OFFSET ?';
    queryParams.push(offset);
  }
  const rows = await db.getAllAsync<TransactionDetailsRow>(
    `${DETAILS_SELECT}${where} ORDER BY t.date DESC, t.id DESC${paginationClause}`,
    queryParams,
  );
  return rows.map(mapTransactionWithDetails);
}

/**
 * Income/expense/investment totals grouped by type and currency for a date range.
 * Transfers are excluded: they move balance between own accounts.
 * EUR conversion happens in JS (utils/stats) using the stored rates.
 */
export interface TypeCurrencyTotal {
  type: 'income' | 'expense' | 'investment';
  currency: string;
  total: number;
}

/**
 * Income/expense totals grouped by month (`YYYY-MM`), type and currency.
 * Used for the month-over-month comparison on the stats screen.
 */
export interface MonthTypeCurrencyTotal extends TypeCurrencyTotal {
  month: string;
}

/**
 * Expense totals grouped by category and currency.
 * `categoryName` is null for uncategorized expenses.
 */
export interface CategoryExpenseTotal {
  categoryId: number | null;
  categoryName: string | null;
  currency: string;
  total: number;
}

interface CategoryExpenseRow {
  category_id: number | null;
  category_name: string | null;
  currency: string;
  total: number;
}

export async function sumTotalsByTypeAndCurrency(
  db: SqlExecutor,
  fromDate: string,
  toDate: string,
): Promise<TypeCurrencyTotal[]> {
  const rows = await db.getAllAsync<TypeCurrencyTotal>(
    `SELECT t.type AS type, t.currency AS currency, SUM(t.amount) AS total
     FROM transactions t
     WHERE t.type IN ('income', 'expense', 'investment') AND t.date >= ? AND t.date <= ?
     GROUP BY t.type, t.currency`,
    [fromDate, toDate],
  );
  return rows;
}

export async function sumMonthlyTotalsByTypeAndCurrency(
  db: SqlExecutor,
  fromDate: string,
  toDate: string,
): Promise<MonthTypeCurrencyTotal[]> {
  const rows = await db.getAllAsync<MonthTypeCurrencyTotal>(
    `SELECT substr(t.date, 1, 7) AS month, t.type AS type, t.currency AS currency, SUM(t.amount) AS total
     FROM transactions t
     WHERE t.type IN ('income', 'expense', 'investment') AND t.date >= ? AND t.date <= ?
     GROUP BY substr(t.date, 1, 7), t.type, t.currency
     ORDER BY month`,
    [fromDate, toDate],
  );
  return rows;
}

export async function sumExpenseTotalsByCategory(
  db: SqlExecutor,
  fromDate: string,
  toDate: string,
): Promise<CategoryExpenseTotal[]> {
  const rows = await db.getAllAsync<CategoryExpenseRow>(
    `SELECT t.category_id, c.name AS category_name, t.currency AS currency, SUM(t.amount) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
     GROUP BY t.category_id, t.currency
     ORDER BY total DESC`,
    [fromDate, toDate],
  );
  return rows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    currency: row.currency,
    total: row.total,
  }));
}