import { migrate } from '@/db/client';
import { insertAccount } from '@/db/repositories/accounts-repo';
import { upsertInstrument } from '@/db/repositories/instruments-repo';
import {
  countTradesForAccount,
  insertTrade,
  listTradesByInstrument,
} from '@/db/repositories/trades-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

describe('trades-repo', () => {
  async function createDbWithAccountAndInstrument() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    const accountId = await insertAccount(db, {
      name: 'Broker',
      identifier: null,
      currency: 'EUR',
      initialBalance: 1000,
    });
    const instrumentId = await upsertInstrument(db, {
      symbol: 'SAN.MC',
      name: 'Banco Santander',
      currency: 'EUR',
      market: 'BME',
      isin: null,
      kind: 'stock',
    });
    return { db, accountId, instrumentId };
  }

  it('inserts buys and sells and lists them in chronological order', async () => {
    const { db, accountId, instrumentId } = await createDbWithAccountAndInstrument();

    await insertTrade(db, {
      instrumentId,
      type: 'buy',
      date: '2026-09-02',
      quantity: 5,
      price: 4,
      currency: 'EUR',
      accountId,
      notes: null,
    });
    await insertTrade(db, {
      instrumentId,
      type: 'buy',
      date: '2026-09-01',
      quantity: 10,
      price: 3.5,
      currency: 'EUR',
      accountId,
      notes: 'Primera compra',
    });

    const trades = await listTradesByInstrument(db, instrumentId);
    expect(trades).toHaveLength(2);
    expect(trades[0]).toMatchObject({ date: '2026-09-01', quantity: 10, notes: 'Primera compra' });
    expect(trades[1]).toMatchObject({ date: '2026-09-02', quantity: 5, notes: null });
    expect(trades[0].accountName).toBe('Broker');
    db.close();
  });

  it('lists trades in reverse order when requested', async () => {
    const { db, accountId, instrumentId } = await createDbWithAccountAndInstrument();
    await insertTrade(db, {
      instrumentId,
      type: 'buy',
      date: '2026-09-01',
      quantity: 10,
      price: 3.5,
      currency: 'EUR',
      accountId,
      notes: null,
    });
    await insertTrade(db, {
      instrumentId,
      type: 'sell',
      date: '2026-09-03',
      quantity: 2,
      price: 4,
      currency: 'EUR',
      accountId,
      notes: null,
    });

    const trades = await listTradesByInstrument(db, instrumentId, true);
    expect(trades.map((trade) => trade.type)).toEqual(['sell', 'buy']);
    db.close();
  });

  it('rejects trades with non-positive quantity or price', async () => {
    const { db, accountId, instrumentId } = await createDbWithAccountAndInstrument();
    const base = {
      instrumentId,
      type: 'buy' as const,
      date: '2026-09-01',
      currency: 'EUR',
      accountId,
      notes: null,
    };

    await expect(insertTrade(db, { ...base, quantity: 0, price: 3 })).rejects.toThrow();
    await expect(insertTrade(db, { ...base, quantity: -1, price: 3 })).rejects.toThrow();
    await expect(insertTrade(db, { ...base, quantity: 1, price: 0 })).rejects.toThrow();
    db.close();
  });

  it('counts trades per account for the deletion guard', async () => {
    const { db, accountId, instrumentId } = await createDbWithAccountAndInstrument();
    expect(await countTradesForAccount(db, accountId)).toBe(0);

    await insertTrade(db, {
      instrumentId,
      type: 'buy',
      date: '2026-09-01',
      quantity: 10,
      price: 3.5,
      currency: 'EUR',
      accountId,
      notes: null,
    });
    expect(await countTradesForAccount(db, accountId)).toBe(1);
    db.close();
  });
});
