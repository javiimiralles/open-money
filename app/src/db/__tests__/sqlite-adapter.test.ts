import type { SQLiteDatabase } from 'expo-sqlite';

import { toSqlExecutor } from '../sqlite-adapter';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeDb(log: string[]): SQLiteDatabase {
  return {
    execAsync: async (sql: string) => {
      log.push(sql);
    },
  } as unknown as SQLiteDatabase;
}

describe('withTransactionAsync', () => {
  it('runs concurrent transactions strictly one after the other', async () => {
    const log: string[] = [];
    const a = toSqlExecutor(fakeDb(log));
    const b = toSqlExecutor(fakeDb(log));

    await Promise.all([
      a.withTransactionAsync(async () => {
        log.push('a-start');
        await tick();
        log.push('a-end');
      }),
      b.withTransactionAsync(async () => {
        log.push('b-start');
      }),
    ]);

    expect(log).toEqual(['BEGIN', 'a-start', 'a-end', 'COMMIT', 'BEGIN', 'b-start', 'COMMIT']);
  });

  it('lets the next transaction run after one throws', async () => {
    const log: string[] = [];
    const db = toSqlExecutor(fakeDb(log));

    const failing = db.withTransactionAsync(async () => {
      throw new Error('boom');
    });
    const next = db.withTransactionAsync(async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
    expect(log).toEqual(['BEGIN', 'ROLLBACK', 'BEGIN', 'COMMIT']);
  });
});
