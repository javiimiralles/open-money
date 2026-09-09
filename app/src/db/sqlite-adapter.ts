/**
 * Adapts an expo-sqlite SQLiteDatabase to the driver-agnostic SqlExecutor
 * interface used by the data access layer and migration runner.
 */

import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';

import type { SqlExecutor } from './client';

export function toSqlExecutor(db: SQLiteDatabase): SqlExecutor {
  return {
    async execAsync(sql: string): Promise<void> {
      await db.execAsync(sql);
    },
    async getFirstAsync<T>(sql: string, params: SQLiteBindValue[] = []): Promise<T | null> {
      return db.getFirstAsync<T>(sql, params);
    },
    async getAllAsync<T>(sql: string, params: SQLiteBindValue[] = []): Promise<T[]> {
      return db.getAllAsync<T>(sql, params);
    },
    async runAsync(sql: string, params: SQLiteBindValue[] = []): Promise<unknown> {
      return db.runAsync(sql, params);
    },
    async withTransactionAsync<T>(fn: () => Promise<T>): Promise<T> {
      await db.execAsync('BEGIN');
      try {
        const result = await fn();
        await db.execAsync('COMMIT');
        return result;
      } catch (error) {
        try {
          await db.execAsync('ROLLBACK');
        } catch {
          // ignore rollback errors
        }
        throw error;
      }
    },
  };
}