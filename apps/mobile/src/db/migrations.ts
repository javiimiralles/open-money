/**
 * Versioned schema migrations.
 *
 * Each entry is applied inside a transaction and the database `user_version`
 * is bumped afterwards. Never edit an applied migration: append a new entry.
 */

import { seedCategoriesSql } from './seed';

export interface Migration {
  version: number;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  identifier TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  initial_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  notes TEXT,
  destination_account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  destination_amount REAL,
  fx_rate REAL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'recurring')),
  recurring_rule_id INTEGER REFERENCES recurring_rules(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE recurring_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'investment')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  destination_account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  instrument_id INTEGER REFERENCES instruments(id) ON DELETE SET NULL,
  notes TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly', 'every_n_days')),
  interval_days INTEGER,
  next_execution TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_run_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE instruments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  market TEXT,
  isin TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('stock', 'etf', 'crypto')),
  last_price REAL,
  last_price_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument_id INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  date TEXT NOT NULL,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  currency TEXT NOT NULL,
  rate_to_eur REAL NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_manual INTEGER NOT NULL DEFAULT 0,
  UNIQUE (currency, fetched_at)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_trades_instrument ON trades(instrument_id);
CREATE INDEX idx_exchange_rates_currency ON exchange_rates(currency);

${seedCategoriesSql()}
`,
  },
];