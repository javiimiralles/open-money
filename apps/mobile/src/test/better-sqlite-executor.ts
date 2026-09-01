/**
 * Test helper: better-sqlite3 adapter implementing SqlExecutor.
 * Lets migration/schema tests run against a real SQLite in Node.
 */

import Database from 'better-sqlite3';

import type { SqlExecutor } from '@/db/client';

export class BetterSqliteExecutor implements SqlExecutor {
  private db: Database.Database;

  constructor() {
    this.db = new Database(':memory:');
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const row = this.db.prepare(sql).get(...params);
    return (row as T) ?? null;
  }

  async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async runAsync(sql: string, params: unknown[] = []): Promise<unknown> {
    return this.db.prepare(sql).run(...params);
  }

  close(): void {
    this.db.close();
  }
}