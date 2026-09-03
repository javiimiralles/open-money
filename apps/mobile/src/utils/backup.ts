/**
 * JSON backup format: serialization, parsing and validation.
 *
 * Pure functions with no I/O so they run in Node tests. Rows are stored
 * with their raw snake_case column names to keep the dump faithful to the
 * schema. Everything is validated in memory before any write happens, so
 * an invalid file never modifies local data.
 */

export type BackupTableName =
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'recurring_rules'
  | 'instruments'
  | 'trades'
  | 'exchange_rates'
  | 'settings';

export type BackupValue = string | number | null;
export type BackupRow = Record<string, BackupValue>;
export type BackupData = Record<BackupTableName, BackupRow[]>;

export interface BackupFile {
  app: 'open-money';
  backupVersion: 1;
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

export const BACKUP_TABLES: readonly BackupTableName[] = [
  'accounts',
  'categories',
  'transactions',
  'recurring_rules',
  'instruments',
  'trades',
  'exchange_rates',
  'settings',
];

const TABLE_COLUMNS: Record<BackupTableName, readonly string[]> = {
  accounts: ['id', 'name', 'identifier', 'currency', 'initial_balance', 'created_at', 'updated_at'],
  categories: ['id', 'name', 'kind', 'created_at'],
  transactions: [
    'id',
    'type',
    'date',
    'amount',
    'currency',
    'account_id',
    'category_id',
    'notes',
    'destination_account_id',
    'destination_amount',
    'fx_rate',
    'source',
    'recurring_rule_id',
    'created_at',
    'updated_at',
    'recurring_batch_id',
  ],
  recurring_rules: [
    'id',
    'type',
    'amount',
    'currency',
    'account_id',
    'destination_account_id',
    'category_id',
    'instrument_id',
    'notes',
    'frequency',
    'interval_days',
    'next_execution',
    'active',
    'last_run_date',
    'created_at',
    'fx_rate',
  ],
  instruments: [
    'id',
    'symbol',
    'name',
    'currency',
    'market',
    'isin',
    'kind',
    'last_price',
    'last_price_at',
    'created_at',
  ],
  trades: [
    'id',
    'instrument_id',
    'type',
    'date',
    'quantity',
    'price',
    'currency',
    'account_id',
    'notes',
    'created_at',
  ],
  exchange_rates: ['id', 'currency', 'rate_to_eur', 'fetched_at', 'is_manual'],
  settings: ['key', 'value'],
};

const REFERENCED_TABLES: readonly BackupTableName[] = [
  'accounts',
  'categories',
  'instruments',
  'recurring_rules',
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function idSet(rows: BackupRow[]): Set<BackupValue> {
  return new Set(rows.map((row) => row.id));
}

function assertReference(
  table: string,
  column: string,
  value: BackupValue,
  targets: Set<BackupValue>,
  targetTable: string,
): void {
  if (value === null) {
    return;
  }
  if (!targets.has(value)) {
    throw new BackupValidationError(
      `Invalid backup: ${table}.${column} references a missing ${targetTable} row.`,
    );
  }
}

function validateDataShape(data: Record<string, unknown>): asserts data is Record<BackupTableName, unknown> {
  for (const table of BACKUP_TABLES) {
    if (!Array.isArray(data[table])) {
      throw new BackupValidationError(`Invalid backup: table "${table}" is missing or not a list.`);
    }
  }
  for (const key of Object.keys(data)) {
    if (!(BACKUP_TABLES as readonly string[]).includes(key)) {
      throw new BackupValidationError(`Invalid backup: unknown table "${key}".`);
    }
  }
}

function validateRows(data: BackupData): void {
  for (const table of BACKUP_TABLES) {
    const allowed = new Set(TABLE_COLUMNS[table]);
    for (const row of data[table]) {
      if (!isPlainObject(row)) {
        throw new BackupValidationError(`Invalid backup: table "${table}" contains an invalid row.`);
      }
      for (const key of Object.keys(row)) {
        if (!allowed.has(key)) {
          throw new BackupValidationError(`Invalid backup: table "${table}" has an unknown column "${key}".`);
        }
      }
    }
  }
  for (const table of REFERENCED_TABLES) {
    for (const row of data[table]) {
      if (typeof row.id !== 'number') {
        throw new BackupValidationError(`Invalid backup: table "${table}" has a row without a numeric id.`);
      }
    }
  }
  for (const row of data.settings) {
    if (typeof row.key !== 'string') {
      throw new BackupValidationError('Invalid backup: table "settings" has a row without a string key.');
    }
  }
}

function validateReferences(data: BackupData): void {
  const accounts = idSet(data.accounts);
  const categories = idSet(data.categories);
  const instruments = idSet(data.instruments);
  const recurringRules = idSet(data.recurring_rules);

  for (const row of data.recurring_rules) {
    assertReference('recurring_rules', 'account_id', row.account_id ?? null, accounts, 'accounts');
    assertReference(
      'recurring_rules',
      'destination_account_id',
      row.destination_account_id ?? null,
      accounts,
      'accounts',
    );
    assertReference('recurring_rules', 'category_id', row.category_id ?? null, categories, 'categories');
    assertReference(
      'recurring_rules',
      'instrument_id',
      row.instrument_id ?? null,
      instruments,
      'instruments',
    );
  }
  for (const row of data.transactions) {
    assertReference('transactions', 'account_id', row.account_id ?? null, accounts, 'accounts');
    assertReference('transactions', 'category_id', row.category_id ?? null, categories, 'categories');
    assertReference(
      'transactions',
      'destination_account_id',
      row.destination_account_id ?? null,
      accounts,
      'accounts',
    );
    assertReference(
      'transactions',
      'recurring_rule_id',
      row.recurring_rule_id ?? null,
      recurringRules,
      'recurring_rules',
    );
  }
  for (const row of data.trades) {
    assertReference('trades', 'instrument_id', row.instrument_id ?? null, instruments, 'instruments');
    assertReference('trades', 'account_id', row.account_id ?? null, accounts, 'accounts');
  }
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file);
}

/**
 * Validates an already-parsed value as a backup file. `currentSchemaVersion`
 * is the PRAGMA user_version of the running database.
 */
export function validateBackup(value: unknown, currentSchemaVersion: number): BackupFile {
  if (!isPlainObject(value)) {
    throw new BackupValidationError('Invalid backup: the file does not contain a backup object.');
  }
  if (value.app !== 'open-money' || value.backupVersion !== 1) {
    throw new BackupValidationError('Invalid backup: not an Open Money backup file.');
  }
  if (typeof value.schemaVersion !== 'number' || typeof value.exportedAt !== 'string') {
    throw new BackupValidationError('Invalid backup: missing backup metadata.');
  }
  if (value.schemaVersion > currentSchemaVersion) {
    throw new BackupValidationError(
      'Invalid backup: it was created by a newer app version. Update the app and try again.',
    );
  }
  if (!isPlainObject(value.data)) {
    throw new BackupValidationError('Invalid backup: missing data tables.');
  }
  validateDataShape(value.data);
  const data = value.data as BackupData;
  validateRows(data);
  validateReferences(data);
  return {
    app: 'open-money',
    backupVersion: 1,
    schemaVersion: value.schemaVersion,
    exportedAt: value.exportedAt,
    data,
  };
}

export function parseBackup(json: string, currentSchemaVersion: number): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new BackupValidationError('Invalid backup: the file is not valid JSON.');
  }
  return validateBackup(parsed, currentSchemaVersion);
}
