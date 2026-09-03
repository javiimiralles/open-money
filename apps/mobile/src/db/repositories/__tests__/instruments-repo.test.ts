import { migrate } from '@/db/client';
import {
  getInstrumentById,
  listInstruments,
  updateLastPrice,
  upsertInstrument,
} from '@/db/repositories/instruments-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

describe('instruments-repo', () => {
  async function createDb() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    return db;
  }

  it('inserts an instrument and lists it', async () => {
    const db = await createDb();
    const id = await upsertInstrument(db, {
      symbol: 'SAN.MC',
      name: 'Banco Santander',
      currency: 'EUR',
      market: 'BME',
      isin: 'ES0113900J37',
      kind: 'stock',
    });
    expect(id).toBeGreaterThan(0);

    const instruments = await listInstruments(db);
    expect(instruments).toHaveLength(1);
    expect(instruments[0]).toMatchObject({
      id,
      symbol: 'SAN.MC',
      name: 'Banco Santander',
      currency: 'EUR',
      market: 'BME',
      isin: 'ES0113900J37',
      kind: 'stock',
      lastPrice: null,
      lastPriceAt: null,
    });
    db.close();
  });

  it('upserting the same symbol updates metadata without duplicating or touching the price', async () => {
    const db = await createDb();
    const id = await upsertInstrument(db, {
      symbol: 'AAPL',
      name: 'Apple',
      currency: 'USD',
      market: null,
      isin: null,
      kind: 'stock',
    });
    await updateLastPrice(db, id, 200, '2026-09-01');

    const sameId = await upsertInstrument(db, {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      currency: 'USD',
      market: 'NASDAQ',
      isin: 'US0378331005',
      kind: 'stock',
    });
    expect(sameId).toBe(id);
    expect(await listInstruments(db)).toHaveLength(1);

    const instrument = await getInstrumentById(db, id);
    expect(instrument).toMatchObject({ name: 'Apple Inc.', market: 'NASDAQ', isin: 'US0378331005' });
    expect(instrument).toMatchObject({ lastPrice: 200, lastPriceAt: '2026-09-01' });
    db.close();
  });

  it('updateLastPrice keeps the newest price only', async () => {
    const db = await createDb();
    const id = await upsertInstrument(db, {
      symbol: 'IWDA.AS',
      name: 'iShares MSCI World',
      currency: 'EUR',
      market: null,
      isin: null,
      kind: 'etf',
    });

    await updateLastPrice(db, id, 80, '2026-09-02');
    await updateLastPrice(db, id, 75, '2026-09-01');
    const instrument = await getInstrumentById(db, id);
    expect(instrument).toMatchObject({ lastPrice: 80, lastPriceAt: '2026-09-02' });
    db.close();
  });

  it('returns null for an unknown instrument', async () => {
    const db = await createDb();
    expect(await getInstrumentById(db, 999)).toBeNull();
    db.close();
  });
});
