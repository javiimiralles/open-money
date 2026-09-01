/**
 * SQLite client: opens the database and applies pending migrations.
 *
 * The migration runner is driver-agnostic: it accepts a minimal async SQL
 * interface so the same logic runs on expo-sqlite (device) and better-sqlite3
 * (Node tests).
 */

import { MIGRATIONS } from './migrations';

export interface SqlExecutor {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  runAsync(sql: string, params?: unknown[]): Promise<unknown>;
}

export class MigrationError extends Error {
  constructor(
    message: string,
    readonly version: number,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export async function migrate(db: SqlExecutor): Promise<void> {
  // Must run outside a transaction; it is a no-op inside one.
  await db.execAsync('PRAGMA foreign_keys = ON');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }
    try {
      await db.execAsync('BEGIN');
      await db.execAsync(migration.up);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      await db.execAsync('COMMIT');
      currentVersion = migration.version;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw new MigrationError(
        `Migration to version ${migration.version} failed: ${error instanceof Error ? error.message : String(error)}`,
        migration.version,
      );
    }
  }
}

export const DATABASE_NAME = 'open-money.db';