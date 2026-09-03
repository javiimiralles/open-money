/**
 * Accounts repository: CRUD, calculated balances, and deletion guards.
 *
 * Balances include investment trades (US-010): buys subtract their total
 * from the funding account and sells add it back. Trade amounts are stored
 * in the account currency, so no conversion is needed here.
 */

import type { SqlExecutor } from '../client';

export interface Account {
  id: number;
  name: string;
  identifier: string | null;
  currency: string;
  initialBalance: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface AccountInput {
  name: string;
  identifier: string | null;
  currency: string;
  initialBalance: number;
  color?: string | null;
}

interface AccountRow {
  id: number;
  name: string;
  identifier: string | null;
  currency: string;
  initial_balance: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

interface AccountBalanceRow extends AccountRow {
  balance: number;
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    identifier: row.identifier,
    currency: row.currency,
    initialBalance: row.initial_balance,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAccountWithBalance(row: AccountBalanceRow): AccountWithBalance {
  return { ...mapAccount(row), balance: row.balance };
}

export async function listAccountsWithBalances(db: SqlExecutor): Promise<AccountWithBalance[]> {
  const rows = await db.getAllAsync<AccountBalanceRow>(
    `SELECT
       a.id,
       a.name,
       a.identifier,
       a.currency,
       a.initial_balance,
       a.color,
       a.created_at,
       a.updated_at,
       a.initial_balance
         + COALESCE((
             SELECT SUM(t.amount) FROM transactions t
             WHERE t.account_id = a.id AND t.type = 'income'
           ), 0)
         - COALESCE((
             SELECT SUM(t.amount) FROM transactions t
             WHERE t.account_id = a.id AND t.type = 'expense'
           ), 0)
         - COALESCE((
             SELECT SUM(t.amount) FROM transactions t
             WHERE t.account_id = a.id AND t.type = 'transfer'
           ), 0)
          + COALESCE((
              SELECT SUM(COALESCE(t.destination_amount, t.amount)) FROM transactions t
              WHERE t.destination_account_id = a.id AND t.type = 'transfer'
            ), 0)
          - COALESCE((
              SELECT SUM(t.quantity * t.price) FROM trades t
              WHERE t.account_id = a.id AND t.type = 'buy'
            ), 0)
          + COALESCE((
              SELECT SUM(t.quantity * t.price) FROM trades t
              WHERE t.account_id = a.id AND t.type = 'sell'
            ), 0)
          AS balance
     FROM accounts a
     ORDER BY a.name COLLATE NOCASE`,
  );
  return rows.map(mapAccountWithBalance);
}

export async function getAccountById(db: SqlExecutor, id: number): Promise<Account | null> {
  const row = await db.getFirstAsync<AccountRow>(
    'SELECT id, name, identifier, currency, initial_balance, color, created_at, updated_at FROM accounts WHERE id = ?',
    [id],
  );
  return row ? mapAccount(row) : null;
}

export async function insertAccount(db: SqlExecutor, input: AccountInput): Promise<number> {
  await db.runAsync(
    'INSERT INTO accounts (name, identifier, currency, initial_balance, color) VALUES (?, ?, ?, ?, ?)',
    [input.name, input.identifier, input.currency, input.initialBalance, input.color ?? null],
  );
  const row = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row?.id ?? 0;
}

export async function updateAccount(db: SqlExecutor, id: number, input: AccountInput): Promise<void> {
  await db.runAsync(
    `UPDATE accounts
     SET name = ?, identifier = ?, currency = ?, initial_balance = ?, color = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [input.name, input.identifier, input.currency, input.initialBalance, input.color ?? null, id],
  );
}

export async function deleteAccount(db: SqlExecutor, id: number): Promise<void> {
  await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
}

export async function countTransactionsForAccount(db: SqlExecutor, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM transactions WHERE account_id = ? OR destination_account_id = ?',
    [id, id],
  );
  return row?.count ?? 0;
}

export async function countActiveRecurringRulesForAccount(db: SqlExecutor, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM recurring_rules WHERE active = 1 AND (account_id = ? OR destination_account_id = ?)',
    [id, id],
  );
  return row?.count ?? 0;
}