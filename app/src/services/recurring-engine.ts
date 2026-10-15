/**
 * Recurring processing engine (US-008).
 * Pure catch-up logic: find overdue rules, generate transactions, advance schedules
 * atomically. Batch undo only removes the batch's transactions; schedules stay advanced.
 */

import { dayOfIso, listDueRecurringRules, updateRecurringRuleSchedule } from '@/db/repositories/recurring-rules-repo';
import {
  countTransactionsByBatch,
  deleteTransactionsByBatch,
  insertTransaction,
} from '@/db/repositories/transactions-repo';
import { computeCatchUpDates, nextOccurrence } from '@/utils/recurrence';
import { destinationAmountFromRate } from '@/utils/transfer';
import type { SqlExecutor } from '@/db/client';

export const RECURRING_LAST_BATCH_KEY = 'recurring_last_batch';

export interface RecurringLastBatch {
  batchId: string;
  appliedAt: string;
  count: number;
}

export interface RecurringProcessResult {
  batchId: string;
  appliedCount: number;
}

function generateBatchId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${rand}`;
}

function nowIsoDateTime(): string {
  return new Date().toISOString();
}

export async function processRecurringOnOpen(
  db: SqlExecutor,
  asOfDate: string,
): Promise<RecurringProcessResult | null> {
  const applicable = await listDueRecurringRules(db, asOfDate);
  if (applicable.length === 0) {
    return null;
  }

  const batchId = generateBatchId();
  let appliedCount = 0;

  await db.withTransactionAsync(async () => {
    for (const rule of applicable) {
      if (rule.type === 'transfer' && rule.destinationAccountId === null) {
        continue;
      }
      const anchorDay = rule.anchorDay ?? dayOfIso(rule.nextExecution);
      const dates = computeCatchUpDates(rule.nextExecution, asOfDate, rule.frequency, rule.intervalDays, anchorDay);
      if (dates.length === 0) {
        continue;
      }
      for (const date of dates) {
        const existing = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM transactions WHERE recurring_rule_id = ? AND date = ?',
          [rule.id, date],
        );
        if (existing) {
          continue;
        }
        if (rule.type === 'transfer') {
          const destinationAmount =
            rule.fxRate !== null && rule.fxRate > 0
              ? destinationAmountFromRate(rule.amount, rule.fxRate)
              : rule.amount;
          await insertTransaction(db, {
            type: 'transfer',
            date,
            amount: rule.amount,
            currency: rule.currency,
            accountId: rule.accountId,
            destinationAccountId: rule.destinationAccountId as number,
            destinationAmount,
            fxRate: rule.fxRate,
            notes: rule.notes,
            source: 'recurring',
            recurringRuleId: rule.id,
            recurringBatchId: batchId,
          });
        } else {
          await insertTransaction(db, {
            type: rule.type as 'income' | 'expense',
            date,
            amount: rule.amount,
            currency: rule.currency,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            notes: rule.notes,
            source: 'recurring',
            recurringRuleId: rule.id,
            recurringBatchId: batchId,
          });
        }
        appliedCount += 1;
      }

      const lastDate = dates[dates.length - 1];
      const next = nextOccurrence(lastDate, rule.frequency, rule.intervalDays, anchorDay);
      // If computed next is still <= asOfDate (should not happen), advance until past asOfDate
      let advancedNext = next;
      let guard = 0;
      while (advancedNext <= asOfDate && guard < 1000) {
        advancedNext = nextOccurrence(advancedNext, rule.frequency, rule.intervalDays, anchorDay);
        guard += 1;
      }
      await updateRecurringRuleSchedule(db, rule.id, advancedNext, lastDate);
    }

    if (appliedCount > 0) {
      const payload: RecurringLastBatch = {
        batchId,
        appliedAt: nowIsoDateTime(),
        count: appliedCount,
      };
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [RECURRING_LAST_BATCH_KEY, JSON.stringify(payload)],
      );
    }
  });

  if (appliedCount === 0) {
    return null;
  }
  return { batchId, appliedCount };
}

export async function getLastRecurringBatch(db: SqlExecutor): Promise<RecurringLastBatch | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
    RECURRING_LAST_BATCH_KEY,
  ]);
  if (!row) {
    return null;
  }
  try {
    return JSON.parse(row.value) as RecurringLastBatch;
  } catch {
    return null;
  }
}

export async function clearLastRecurringBatch(db: SqlExecutor): Promise<void> {
  await db.runAsync('DELETE FROM settings WHERE key = ?', [RECURRING_LAST_BATCH_KEY]);
}

/**
 * Loads the stored batch only if its transactions still exist. Stale batches
 * (e.g. applied transactions later deleted) are cleared and hidden so the
 * notice does not resurface on every app open.
 */
export async function loadActiveRecurringBatch(db: SqlExecutor): Promise<RecurringLastBatch | null> {
  const batch = await getLastRecurringBatch(db);
  if (!batch) {
    return null;
  }
  const remaining = await countTransactionsByBatch(db, batch.batchId);
  if (remaining === 0) {
    await clearLastRecurringBatch(db);
    return null;
  }
  return batch;
}

export async function undoLastRecurringBatch(db: SqlExecutor): Promise<number> {
  const batch = await getLastRecurringBatch(db);
  if (!batch) {
    return 0;
  }
  let deleted = 0;
  await db.withTransactionAsync(async () => {
    deleted = await deleteTransactionsByBatch(db, batch.batchId);
    if (deleted === 0 && batch.count > 0) {
      deleted = batch.count;
    }
    await db.runAsync('DELETE FROM settings WHERE key = ?', [RECURRING_LAST_BATCH_KEY]);
  });
  return deleted;
}
