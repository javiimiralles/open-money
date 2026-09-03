/**
 * Trades repository: buy/sell records linked to an instrument and a funding
 * account (US-010). Balances stay derived on read, so trades flow into
 * `listAccountsWithBalances` without extra bookkeeping.
 */

import type { SqlExecutor } from '../client';

export type TradeType = 'buy' | 'sell';

export interface Trade {
  id: number;
  instrumentId: number;
  type: TradeType;
  date: string;
  quantity: number;
  price: number;
  currency: string;
  accountId: number;
  notes: string | null;
  createdAt: string;
}

export interface TradeInput {
  instrumentId: number;
  type: TradeType;
  date: string;
  quantity: number;
  price: number;
  currency: string;
  accountId: number;
  notes: string | null;
}

export interface TradeWithDetails extends Trade {
  accountName: string;
}

interface TradeRow {
  id: number;
  instrument_id: number;
  type: TradeType;
  date: string;
  quantity: number;
  price: number;
  currency: string;
  account_id: number;
  notes: string | null;
  created_at: string;
}

interface TradeDetailsRow extends TradeRow {
  account_name: string;
}

function mapTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    type: row.type,
    date: row.date,
    quantity: row.quantity,
    price: row.price,
    currency: row.currency,
    accountId: row.account_id,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapTradeWithDetails(row: TradeDetailsRow): TradeWithDetails {
  return { ...mapTrade(row), accountName: row.account_name };
}

const DETAILS_SELECT = `
  SELECT
    t.id,
    t.instrument_id,
    t.type,
    t.date,
    t.quantity,
    t.price,
    t.currency,
    t.account_id,
    t.notes,
    t.created_at,
    a.name AS account_name
  FROM trades t
  JOIN accounts a ON a.id = t.account_id
`;

/**
 * Defense-in-depth guard: trades must move a positive quantity at a positive
 * price. Forms validate this too; the repository rejects invalid callers.
 */
function assertValidTrade(input: TradeInput): void {
  if (input.quantity <= 0) {
    throw new Error('Trade quantity must be greater than 0.');
  }
  if (input.price <= 0) {
    throw new Error('Trade price must be greater than 0.');
  }
}

export async function insertTrade(db: SqlExecutor, input: TradeInput): Promise<number> {
  assertValidTrade(input);
  await db.runAsync(
    `INSERT INTO trades (instrument_id, type, date, quantity, price, currency, account_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.instrumentId,
      input.type,
      input.date,
      input.quantity,
      input.price,
      input.currency,
      input.accountId,
      input.notes,
    ],
  );
  const row = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row?.id ?? 0;
}

/**
 * Lists the trades of an instrument. Ascending order (position math) is the
 * default; pass `descending` for display in the instrument detail screen.
 */
export async function listTradesByInstrument(
  db: SqlExecutor,
  instrumentId: number,
  descending = false,
): Promise<TradeWithDetails[]> {
  const rows = await db.getAllAsync<TradeDetailsRow>(
    `${DETAILS_SELECT} WHERE t.instrument_id = ? ORDER BY t.date ${descending ? 'DESC' : 'ASC'}, t.id ${
      descending ? 'DESC' : 'ASC'
    }`,
    [instrumentId],
  );
  return rows.map(mapTradeWithDetails);
}

export async function countTradesForAccount(db: SqlExecutor, accountId: number): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM trades WHERE account_id = ?',
    [accountId],
  );
  return row?.count ?? 0;
}
