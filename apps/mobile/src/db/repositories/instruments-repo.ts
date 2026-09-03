/**
 * Instruments repository: upserts from backend search results and manual
 * entry, plus last-known-price tracking (US-010).
 */

import type { SqlExecutor } from '../client';

export type InstrumentKind = 'stock' | 'etf' | 'crypto';

export interface Instrument {
  id: number;
  symbol: string;
  name: string;
  currency: string;
  market: string | null;
  isin: string | null;
  kind: InstrumentKind;
  lastPrice: number | null;
  lastPriceAt: string | null;
  createdAt: string;
}

export interface InstrumentInput {
  symbol: string;
  name: string;
  currency: string;
  market: string | null;
  isin: string | null;
  kind: InstrumentKind;
}

interface InstrumentRow {
  id: number;
  symbol: string;
  name: string;
  currency: string;
  market: string | null;
  isin: string | null;
  kind: InstrumentKind;
  last_price: number | null;
  last_price_at: string | null;
  created_at: string;
}

function mapInstrument(row: InstrumentRow): Instrument {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    currency: row.currency,
    market: row.market,
    isin: row.isin,
    kind: row.kind,
    lastPrice: row.last_price,
    lastPriceAt: row.last_price_at,
    createdAt: row.created_at,
  };
}

const SELECT_ALL = `
  SELECT id, symbol, name, currency, market, isin, kind, last_price, last_price_at, created_at
  FROM instruments
`;

/**
 * Inserts a new instrument or refreshes the metadata of an existing one
 * matched by symbol (unique since migration v5). The last known price is
 * never overwritten by a search result.
 */
export async function upsertInstrument(db: SqlExecutor, input: InstrumentInput): Promise<number> {
  await db.runAsync(
    `INSERT INTO instruments (symbol, name, currency, market, isin, kind)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(symbol) DO UPDATE SET
       name = excluded.name,
       currency = excluded.currency,
       market = excluded.market,
       isin = excluded.isin,
       kind = excluded.kind`,
    [input.symbol, input.name, input.currency, input.market, input.isin, input.kind],
  );
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM instruments WHERE symbol = ?', [
    input.symbol,
  ]);
  return row?.id ?? 0;
}

export async function getInstrumentById(db: SqlExecutor, id: number): Promise<Instrument | null> {
  const row = await db.getFirstAsync<InstrumentRow>(`${SELECT_ALL} WHERE id = ?`, [id]);
  return row ? mapInstrument(row) : null;
}

export async function listInstruments(db: SqlExecutor): Promise<Instrument[]> {
  const rows = await db.getAllAsync<InstrumentRow>(`${SELECT_ALL} ORDER BY name COLLATE NOCASE`);
  return rows.map(mapInstrument);
}

/**
 * Records a known price, but only when it is not older than the stored one.
 * Dates compare lexicographically (ISO `YYYY-MM-DD` and ISO datetimes).
 */
export async function updateLastPrice(
  db: SqlExecutor,
  id: number,
  price: number,
  date: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE instruments
     SET last_price = ?, last_price_at = ?
     WHERE id = ? AND (last_price_at IS NULL OR last_price_at <= ?)`,
    [price, date, id, date],
  );
}
