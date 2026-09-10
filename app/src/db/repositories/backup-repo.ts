/**
 * Backup repository: full-table dump and transactional replacement.
 *
 * The dump reads raw rows so exports stay faithful to the schema. The
 * replacement validates everything in memory first and then swaps all
 * tables inside a single transaction: any failure rolls everything back.
 */

import type { SqlExecutor } from '../client';
import {
  BACKUP_TABLES,
  validateBackup,
  type BackupData,
  type BackupFile,
  type BackupRow,
  type BackupTableName,
} from '@/utils/backup';

const DELETE_ORDER: readonly BackupTableName[] = [
  'transactions',
  'recurring_rules',
  'categories',
  'accounts',
  'exchange_rates',
  'settings',
];

const INSERT_ORDER: readonly BackupTableName[] = [
  'accounts',
  'categories',
  'recurring_rules',
  'transactions',
  'exchange_rates',
  'settings',
];

export async function getSchemaVersion(db: SqlExecutor): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

export async function dumpAllTables(db: SqlExecutor): Promise<BackupFile> {
  const entries = await Promise.all(
    BACKUP_TABLES.map(async (table) => {
      const rows = await db.getAllAsync<BackupRow>(`SELECT * FROM ${table}`);
      return [table, rows] as const;
    }),
  );
  const data = Object.fromEntries(entries) as BackupData;
  return {
    app: 'open-money',
    backupVersion: 1,
    schemaVersion: await getSchemaVersion(db),
    exportedAt: new Date().toISOString(),
    data,
  };
}

async function insertRows(db: SqlExecutor, table: BackupTableName, rows: BackupRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const placeholders = columns.map(() => '?').join(', ');
  for (const row of rows) {
    await db.runAsync(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      columns.map((column) => row[column] ?? null),
    );
  }
}

/**
 * Replaces all local data with a validated backup file. Throws
 * BackupValidationError without touching the database on invalid input.
 */
export async function replaceAllTables(db: SqlExecutor, file: BackupFile): Promise<void> {
  const validated = validateBackup(file, await getSchemaVersion(db));
  await db.withTransactionAsync(async () => {
    for (const table of DELETE_ORDER) {
      await db.execAsync(`DELETE FROM ${table}`);
    }
    for (const table of INSERT_ORDER) {
      await insertRows(db, table, validated.data[table]);
    }
  });
}
