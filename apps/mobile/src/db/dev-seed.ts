/**
 * Dev-data writer: seeds a full fake dataset or wipes all user data.
 *
 * Everything runs inside a single transaction. The repo insert functions
 * cannot be reused here because SqlExecutor transactions are not nestable,
 * so the statements below mirror their column lists instead.
 *
 * Clearing keeps `settings` (theme, etc.) and restores the base category
 * catalog with explicit ids via the migration seed helpers.
 */

import type { SqlExecutor } from './client';
import {
  generateDevDataset,
  toRecurringRuleInputs,
  toTransactionInputs,
  type DevDataset,
  type DevSeedOptions,
} from './dev-data-generator';
import { seedCategoriesSql, seedCategoryIconsSql } from './seed';
import type { RecurringRuleInput } from './repositories/recurring-rules-repo';
import type { TransactionInput } from './repositories/transactions-repo';

export interface DevSeedSummary {
  accounts: number;
  transactions: number;
  recurringRules: number;
}

async function clearUserData(db: SqlExecutor): Promise<void> {
  await db.execAsync('DELETE FROM transactions');
  await db.execAsync('DELETE FROM recurring_rules');
  await db.execAsync('DELETE FROM categories');
  await db.execAsync('DELETE FROM accounts');
  await db.execAsync('DELETE FROM exchange_rates');
  await db.execAsync(
    `DELETE FROM sqlite_sequence WHERE name IN ('accounts', 'transactions', 'recurring_rules', 'exchange_rates')`,
  );
  await db.execAsync(seedCategoriesSql());
  await db.execAsync(seedCategoryIconsSql());
}

async function insertSeedAccounts(db: SqlExecutor, dataset: DevDataset): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const account of dataset.accounts) {
    await db.runAsync(
      'INSERT INTO accounts (name, identifier, currency, initial_balance, color, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
      [
        account.input.name,
        account.input.identifier,
        account.input.currency,
        account.input.initialBalance,
        account.input.color ?? null,
        account.input.isPrimary === true ? 1 : 0,
      ],
    );
    const row = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
    ids.set(account.key, row?.id ?? 0);
  }
  return ids;
}

async function insertSeedTransactions(db: SqlExecutor, inputs: TransactionInput[]): Promise<void> {
  for (const input of inputs) {
    if (input.type === 'transfer') {
      await db.runAsync(
        `INSERT INTO transactions
          (type, date, amount, currency, account_id, category_id, notes, destination_account_id, destination_amount, fx_rate, source, recurring_rule_id, recurring_batch_id)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'manual', NULL, NULL)`,
        [
          input.type,
          input.date,
          input.amount,
          input.currency,
          input.accountId,
          input.notes,
          input.destinationAccountId,
          input.destinationAmount,
          input.fxRate,
        ],
      );
    } else {
      await db.runAsync(
        `INSERT INTO transactions (type, date, amount, currency, account_id, category_id, notes, source, recurring_rule_id, recurring_batch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', NULL, NULL)`,
        [input.type, input.date, input.amount, input.currency, input.accountId, input.categoryId, input.notes],
      );
    }
  }
}

async function insertSeedRules(db: SqlExecutor, inputs: RecurringRuleInput[]): Promise<void> {
  for (const input of inputs) {
    await db.runAsync(
      `INSERT INTO recurring_rules
        (type, amount, currency, account_id, destination_account_id, category_id, notes, frequency, interval_days, next_execution, active, fx_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.type,
        input.amount,
        input.currency,
        input.accountId,
        input.destinationAccountId,
        input.categoryId,
        input.notes,
        input.frequency,
        input.intervalDays,
        input.nextExecution,
        input.active ? 1 : 0,
        input.fxRate,
      ],
    );
  }
}

async function insertSeedRates(db: SqlExecutor, dataset: DevDataset): Promise<void> {
  const fetchedAt = new Date().toISOString();
  for (const rate of dataset.exchangeRates) {
    await db.runAsync(
      'INSERT INTO exchange_rates (currency, rate_to_eur, fetched_at, is_manual) VALUES (?, ?, ?, 1)',
      [rate.currency, rate.rateToEur, fetchedAt],
    );
  }
}

/**
 * Wipes user data and seeds a full fake dataset (6 accounts, ~12 months of
 * transactions, recurring rules and USD/GBP exchange rates).
 */
export async function seedDevData(db: SqlExecutor, options: DevSeedOptions = {}): Promise<DevSeedSummary> {
  const dataset = generateDevDataset(options);
  return db.withTransactionAsync(async () => {
    await clearUserData(db);
    const accountIds = await insertSeedAccounts(db, dataset);
    await insertSeedRules(db, toRecurringRuleInputs(dataset, accountIds));
    const transactions = toTransactionInputs(dataset, accountIds);
    await insertSeedTransactions(db, transactions);
    await insertSeedRates(db, dataset);
    return {
      accounts: dataset.accounts.length,
      transactions: transactions.length,
      recurringRules: dataset.recurringRules.length,
    };
  });
}

/**
 * Deletes all user data (accounts, transactions, rules, rates) and restores
 * the base categories. Settings are preserved.
 */
export async function clearAllDevData(db: SqlExecutor): Promise<void> {
  await db.withTransactionAsync(async () => {
    await clearUserData(db);
  });
}
