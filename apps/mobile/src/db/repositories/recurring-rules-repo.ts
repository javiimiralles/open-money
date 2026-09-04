/**
 * Recurring rules repository (US-008).
 */

import type { SqlExecutor } from '../client';

export type RecurringRuleType = 'income' | 'expense' | 'transfer';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly' | 'every_n_days';

export interface RecurringRule {
  id: number;
  type: RecurringRuleType;
  amount: number;
  currency: string;
  accountId: number;
  destinationAccountId: number | null;
  categoryId: number | null;
  notes: string | null;
  frequency: RecurrenceFrequency;
  intervalDays: number | null;
  nextExecution: string;
  active: boolean;
  lastRunDate: string | null;
  fxRate: number | null;
  createdAt: string;
}

export interface RecurringRuleWithDetails extends RecurringRule {
  accountName: string;
  destinationAccountName: string | null;
  categoryName: string | null;
}

export interface RecurringRuleInput {
  type: RecurringRuleType;
  amount: number;
  currency: string;
  accountId: number;
  destinationAccountId: number | null;
  categoryId: number | null;
  notes: string | null;
  frequency: RecurrenceFrequency;
  intervalDays: number | null;
  nextExecution: string;
  active: boolean;
  fxRate: number | null;
}

interface RecurringRuleRow {
  id: number;
  type: RecurringRuleType;
  amount: number;
  currency: string;
  account_id: number;
  destination_account_id: number | null;
  category_id: number | null;
  notes: string | null;
  frequency: RecurrenceFrequency;
  interval_days: number | null;
  next_execution: string;
  active: number;
  last_run_date: string | null;
  fx_rate: number | null;
  created_at: string;
}

interface RecurringRuleDetailsRow extends RecurringRuleRow {
  account_name: string;
  destination_account_name: string | null;
  category_name: string | null;
}

function mapRule(row: RecurringRuleRow): RecurringRule {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    accountId: row.account_id,
    destinationAccountId: row.destination_account_id,
    categoryId: row.category_id,
    notes: row.notes,
    frequency: row.frequency,
    intervalDays: row.interval_days,
    nextExecution: row.next_execution,
    active: row.active === 1,
    lastRunDate: row.last_run_date,
    fxRate: row.fx_rate,
    createdAt: row.created_at,
  };
}

function mapRuleWithDetails(row: RecurringRuleDetailsRow): RecurringRuleWithDetails {
  return {
    ...mapRule(row),
    accountName: row.account_name,
    destinationAccountName: row.destination_account_name,
    categoryName: row.category_name,
  };
}

const DETAILS_SELECT = `
  SELECT
    r.id,
    r.type,
    r.amount,
    r.currency,
    r.account_id,
    r.destination_account_id,
    r.category_id,
    r.notes,
    r.frequency,
    r.interval_days,
    r.next_execution,
    r.active,
    r.last_run_date,
    r.fx_rate,
    r.created_at,
    a.name AS account_name,
    da.name AS destination_account_name,
    c.name AS category_name
  FROM recurring_rules r
  JOIN accounts a ON a.id = r.account_id
  LEFT JOIN accounts da ON da.id = r.destination_account_id
  LEFT JOIN categories c ON c.id = r.category_id
`;

export async function insertRecurringRule(db: SqlExecutor, input: RecurringRuleInput): Promise<number> {
  await db.runAsync(
    `INSERT INTO recurring_rules
      (type, amount, currency, account_id, destination_account_id, category_id, notes, frequency, interval_days, next_execution, active, fx_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.type,
      input.amount,
      input.currency,
      input.accountId,
      input.destinationAccountId,
      input.categoryId,
      input.notes,
      input.frequency,
      input.intervalDays,
      input.nextExecution,
      input.active ? 1 : 0,
      input.fxRate,
    ],
  );
  const row = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row?.id ?? 0;
}

export async function updateRecurringRule(
  db: SqlExecutor,
  id: number,
  input: RecurringRuleInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE recurring_rules
     SET type = ?, amount = ?, currency = ?, account_id = ?, destination_account_id = ?, category_id = ?, notes = ?, frequency = ?, interval_days = ?, next_execution = ?, active = ?, fx_rate = ?
     WHERE id = ?`,
    [
      input.type,
      input.amount,
      input.currency,
      input.accountId,
      input.destinationAccountId,
      input.categoryId,
      input.notes,
      input.frequency,
      input.intervalDays,
      input.nextExecution,
      input.active ? 1 : 0,
      input.fxRate,
      id,
    ],
  );
}

export async function deleteRecurringRule(db: SqlExecutor, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', [id]);
}

export async function getRecurringRuleById(db: SqlExecutor, id: number): Promise<RecurringRuleWithDetails | null> {
  const row = await db.getFirstAsync<RecurringRuleDetailsRow>(`${DETAILS_SELECT} WHERE r.id = ?`, [id]);
  return row ? mapRuleWithDetails(row) : null;
}

export async function listRecurringRules(db: SqlExecutor): Promise<RecurringRuleWithDetails[]> {
  const rows = await db.getAllAsync<RecurringRuleDetailsRow>(`${DETAILS_SELECT} ORDER BY r.next_execution ASC, r.id ASC`);
  return rows.map(mapRuleWithDetails);
}

export async function listDueRecurringRules(db: SqlExecutor, asOfDate: string): Promise<RecurringRule[]> {
  const rows = await db.getAllAsync<RecurringRuleRow>(
    'SELECT * FROM recurring_rules WHERE active = 1 AND next_execution <= ? ORDER BY next_execution ASC, id ASC',
    [asOfDate],
  );
  return rows.map(mapRule);
}

export async function setRecurringRuleActive(db: SqlExecutor, id: number, active: boolean): Promise<void> {
  await db.runAsync('UPDATE recurring_rules SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
}

export async function updateRecurringRuleSchedule(
  db: SqlExecutor,
  id: number,
  nextExecution: string,
  lastRunDate: string | null,
): Promise<void> {
  await db.runAsync('UPDATE recurring_rules SET next_execution = ?, last_run_date = ? WHERE id = ?', [
    nextExecution,
    lastRunDate,
    id,
  ]);
}
