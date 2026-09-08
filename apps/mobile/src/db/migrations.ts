/**
 * Versioned schema migrations.
 *
 * Each entry is applied inside a transaction and the database `user_version`
 * is bumped afterwards. Never edit an applied migration: append a new entry.
 */

import {
  seedCategoriesSql,
  seedCategoryIconsSql,
  seedInvestmentCategoriesSql,
  seedInvestmentCategoryIconsSql,
} from './seed';

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
  {
    version: 2,
    up: `
-- Compound index for the most common combined filter (account + date range).
CREATE INDEX idx_transactions_account_date ON transactions(account_id, date);
`,
  },
  {
    version: 3,
    up: `
-- Transfer destination legs are scanned by balance derivation and the
-- account filter (US-005).
CREATE INDEX idx_transactions_destination_account ON transactions(destination_account_id);
`,
  },
  {
    version: 4,
    up: `
-- Recurring batch grouping and idempotency (US-008).
ALTER TABLE transactions ADD COLUMN recurring_batch_id TEXT;
ALTER TABLE recurring_rules ADD COLUMN fx_rate REAL;
CREATE INDEX idx_transactions_recurring_batch ON transactions(recurring_batch_id);
CREATE UNIQUE INDEX idx_transactions_recurring_dedup ON transactions(recurring_rule_id, date) WHERE recurring_rule_id IS NOT NULL;
`,
  },
  {
    version: 5,
    up: `
-- Instruments are looked up by symbol on search upserts (US-010).
CREATE UNIQUE INDEX idx_instruments_symbol ON instruments(symbol);
`,
  },
  {
    version: 6,
    up: `
-- Optional user-chosen color identifying an account (hex string, NULL = none).
ALTER TABLE accounts ADD COLUMN color TEXT;
`,
  },
  {
    version: 7,
    up: `
-- Single primary account (1 = primary, 0 = not). Exclusivity is enforced
-- by the repository, not by a constraint.
ALTER TABLE accounts ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0;
`,
  },
  {
    version: 8,
    up: `
-- Optional user-chosen icon identifying a category
-- (MaterialCommunityIcons name, NULL = default). Base categories are
-- backfilled by id; categories renamed by the user keep their new names.
ALTER TABLE categories ADD COLUMN icon TEXT;

${seedCategoryIconsSql()}
`,
  },
  {
    version: 9,
    up: `
-- Drop investments: remove leftover investment rules (the engine never
-- executed them) and the market backend settings, then drop the
-- investment tables.
DELETE FROM recurring_rules WHERE type = 'investment';
DELETE FROM settings WHERE key IN ('backend_url', 'api_key');

DROP TABLE trades;
DROP TABLE instruments;

-- Rebuild recurring_rules without the instrument_id column and without
-- 'investment' in the type CHECK. foreign_keys stays ON (toggling it is a
-- no-op inside the migration transaction), so the transactions links are
-- preserved across the swap: the implicit DELETE of the DROP sets
-- transactions.recurring_rule_id to NULL and it is restored afterwards.
CREATE TEMP TABLE _tx_rule_links AS
  SELECT id, recurring_rule_id FROM transactions WHERE recurring_rule_id IS NOT NULL;

CREATE TABLE recurring_rules_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  destination_account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  notes TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly', 'every_n_days')),
  interval_days INTEGER,
  next_execution TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_run_date TEXT,
  fx_rate REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO recurring_rules_new
  (id, type, amount, currency, account_id, destination_account_id, category_id, notes, frequency, interval_days, next_execution, active, last_run_date, fx_rate, created_at)
  SELECT id, type, amount, currency, account_id, destination_account_id, category_id, notes, frequency, interval_days, next_execution, active, last_run_date, fx_rate, created_at
  FROM recurring_rules;

DROP TABLE recurring_rules;
ALTER TABLE recurring_rules_new RENAME TO recurring_rules;

UPDATE transactions
SET recurring_rule_id = (
  SELECT l.recurring_rule_id FROM _tx_rule_links l
  JOIN recurring_rules r ON r.id = l.recurring_rule_id
  WHERE l.id = transactions.id
)
WHERE id IN (SELECT id FROM _tx_rule_links);

DROP TABLE _tx_rule_links;
`,
  },
  {
    version: 10,
    up: `
-- Investment categories: allow the 'investment' kind. Rebuild follows the
-- v9 swap pattern: the DROP fires ON DELETE SET NULL on the category links,
-- so transactions and recurring rules links are preserved in temp tables and
-- restored afterwards. Investment base categories are seeded with explicit
-- ids continuing the base catalog.
CREATE TEMP TABLE _tx_cat_links AS
  SELECT id, category_id FROM transactions WHERE category_id IS NOT NULL;

CREATE TEMP TABLE _rule_cat_links AS
  SELECT id, category_id FROM recurring_rules WHERE category_id IS NOT NULL;

CREATE TABLE categories_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'investment')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  icon TEXT
);

INSERT INTO categories_new (id, name, kind, created_at, icon)
  SELECT id, name, kind, created_at, icon FROM categories;

DROP TABLE categories;
ALTER TABLE categories_new RENAME TO categories;

UPDATE transactions
SET category_id = (
  SELECT l.category_id FROM _tx_cat_links l WHERE l.id = transactions.id
)
WHERE id IN (SELECT id FROM _tx_cat_links);

UPDATE recurring_rules
SET category_id = (
  SELECT l.category_id FROM _rule_cat_links l WHERE l.id = recurring_rules.id
)
WHERE id IN (SELECT id FROM _rule_cat_links);

DROP TABLE _tx_cat_links;
DROP TABLE _rule_cat_links;

${seedInvestmentCategoriesSql()}

${seedInvestmentCategoryIconsSql()}
`,
  },
  {
    version: 11,
    up: `
-- Investment transactions: allow the 'investment' type. No other table
-- references transactions, so the swap needs no link preservation. All
-- existing indexes are recreated after the rename.
CREATE TABLE transactions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'investment')),
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
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  recurring_batch_id TEXT
);

INSERT INTO transactions_new
  (id, type, date, amount, currency, account_id, category_id, notes, destination_account_id, destination_amount, fx_rate, source, recurring_rule_id, created_at, updated_at, recurring_batch_id)
  SELECT id, type, date, amount, currency, account_id, category_id, notes, destination_account_id, destination_amount, fx_rate, source, recurring_rule_id, created_at, updated_at, recurring_batch_id
  FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account_date ON transactions(account_id, date);
CREATE INDEX idx_transactions_destination_account ON transactions(destination_account_id);
CREATE INDEX idx_transactions_recurring_batch ON transactions(recurring_batch_id);
CREATE UNIQUE INDEX idx_transactions_recurring_dedup ON transactions(recurring_rule_id, date) WHERE recurring_rule_id IS NOT NULL;
`,
  },
];