/**
 * Accounts repository: CRUD, calculated balances, and deletion guards.
 *
 * At most one account is the primary one; setting a new primary demotes
 * the previous. Balances are derived from the initial balance plus the
 * signed transaction legs (income adds, expenses and sent transfers
 * subtract, received transfers add).
 */

import type { SqlExecutor } from '../client';

export interface Account {
  id: number;
  name: string;
  identifier: string | null;
  currency: string;
  initialBalance: number;
  color: string | null;
  isPrimary: boolean;
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
  isPrimary?: boolean;
}

interface AccountRow {
  id: number;
  name: string;
  identifier: string | null;
  currency: string;
  initial_balance: number;
  color: string | null;
  is_primary: number;
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
    isPrimary: row.is_primary === 1,
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
       a.is_primary,
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
           AS balance
     FROM accounts a
     ORDER BY a.is_primary DESC, a.created_at ASC, a.name COLLATE NOCASE ASC`,
  );
  return rows.map(mapAccountWithBalance);
}

export async function getAccountById(db: SqlExecutor, id: number): Promise<Account | null> {
  const row = await db.getFirstAsync<AccountRow>(
    'SELECT id, name, identifier, currency, initial_balance, color, is_primary, created_at, updated_at FROM accounts WHERE id = ?',
    [id],
  );
  return row ? mapAccount(row) : null;
}

function toPrimaryFlag(isPrimary: boolean | undefined): number {
  return isPrimary === true ? 1 : 0;
}

async function clearPrimaryAccounts(db: SqlExecutor): Promise<void> {
  await db.runAsync('UPDATE accounts SET is_primary = 0 WHERE is_primary <> 0');
}

export async function insertAccount(db: SqlExecutor, input: AccountInput): Promise<number> {
  return db.withTransactionAsync(async () => {
    if (input.isPrimary === true) {
      await clearPrimaryAccounts(db);
    }
    await db.runAsync(
      'INSERT INTO accounts (name, identifier, currency, initial_balance, color, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
      [input.name, input.identifier, input.currency, input.initialBalance, input.color ?? null, toPrimaryFlag(input.isPrimary)],
    );
    const row = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
    return row?.id ?? 0;
  });
}

export async function updateAccount(db: SqlExecutor, id: number, input: AccountInput): Promise<void> {
  await db.withTransactionAsync(async () => {
    if (input.isPrimary === true) {
      await clearPrimaryAccounts(db);
    }
    await db.runAsync(
      `UPDATE accounts
       SET name = ?, identifier = ?, currency = ?, initial_balance = ?, color = ?, is_primary = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.name,
        input.identifier,
        input.currency,
        input.initialBalance,
        input.color ?? null,
        toPrimaryFlag(input.isPrimary),
        id,
      ],
    );
  });
}

export async function deleteAccount(db: SqlExecutor, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
    const remaining = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM accounts WHERE is_primary = 1',
    );
    if ((remaining?.count ?? 0) === 0) {
      await db.runAsync(
        `UPDATE accounts SET is_primary = 1 WHERE id = (
           SELECT id FROM accounts ORDER BY name COLLATE NOCASE LIMIT 1
         )`,
      );
    }
  });
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