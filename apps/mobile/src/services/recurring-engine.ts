/**
 * Recurring processing engine (US-008).
 * Pure catch-up logic: find overdue rules, generate transactions, advance schedules
 * atomically. Batch undo restores the snapshot stored in settings.
 */

import { listDueRecurringRules, updateRecurringRuleSchedule } from '@/db/repositories/recurring-rules-repo';
import { deleteTransactionsByBatch, insertTransaction } from '@/db/repositories/transactions-repo';
import { computeCatchUpDates, nextOccurrence } from '@/utils/recurrence';
import { destinationAmountFromRate } from '@/utils/transfer';
import type { SqlExecutor } from '@/db/client';

export const RECURRING_LAST_BATCH_KEY = 'recurring_last_batch';

export interface RecurringLastBatch {
  batchId: string;
  appliedAt: string;
  count: number;
  rules: { ruleId: number; prevNextExecution: string; prevLastRunDate: string | null }[];
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
  const dueRules = await listDueRecurringRules(db, asOfDate);
  const applicable = dueRules.filter((rule) => rule.type !== 'investment');
  if (applicable.length === 0) {
    return null;
  }

  const batchId = generateBatchId();
  const snapshot: RecurringLastBatch['rules'] = [];
  let appliedCount = 0;

  await db.withTransactionAsync(async () => {
    for (const rule of applicable) {
      const dates = computeCatchUpDates(rule.nextExecution, asOfDate, rule.frequency, rule.intervalDays);
      if (dates.length === 0) {
        continue;
      }
      snapshot.push({
        ruleId: rule.id,
        prevNextExecution: rule.nextExecution,
        prevLastRunDate: rule.lastRunDate,
      });

      for (const date of dates) {
        if (rule.type === 'transfer') {
          if (rule.destinationAccountId === null) {
            continue;
          }
          const destinationAmount =
            rule.fxRate !== null && rule.fxRate > 0
              ? destinationAmountFromRate(rule.amount, rule.fxRate)
              : rule.amount;
          const fxRate = rule.fxRate ?? (rule.amount > 0 ? destinationAmount / rule.amount : null);
          // Normalize: same-currency transfers should not store a rate
          const storedFxRate = rule.fxRate !== null ? fxRate : null;
          await insertTransaction(db, {
            type: 'transfer',
            date,
            amount: rule.amount,
            currency: rule.currency,
            accountId: rule.accountId,
            destinationAccountId: rule.destinationAccountId,
            destinationAmount,
            fxRate: storedFxRate,
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
      const next = nextOccurrence(lastDate, rule.frequency, rule.intervalDays);
      // If computed next is still <= asOfDate (should not happen), advance until past asOfDate
      let advancedNext = next;
      let guard = 0;
      while (advancedNext <= asOfDate && guard < 1000) {
        advancedNext = nextOccurrence(advancedNext, rule.frequency, rule.intervalDays);
        guard += 1;
      }
      await updateRecurringRuleSchedule(db, rule.id, advancedNext, lastDate);
    }

    if (appliedCount > 0) {
      const payload: RecurringLastBatch = {
        batchId,
        appliedAt: nowIsoDateTime(),
        count: appliedCount,
        rules: snapshot,
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

export async function undoLastRecurringBatch(db: SqlExecutor): Promise<number> {
  const batch = await getLastRecurringBatch(db);
  if (!batch) {
    return 0;
  }
  let deleted = 0;
  await db.withTransactionAsync(async () => {
    const result = (await db.runAsync('DELETE FROM transactions WHERE recurring_batch_id = ?', [
      batch.batchId,
    ])) as { changes?: number };
    deleted = result?.changes ?? 0;
    // Fallback count if driver doesn't return changes
    if (deleted === 0 && batch.count > 0) {
      deleted = batch.count;
    }
    for (const entry of batch.rules) {
      await updateRecurringRuleSchedule(db, entry.ruleId, entry.prevNextExecution, entry.prevLastRunDate);
    }
    await db.runAsync('DELETE FROM settings WHERE key = ?', [RECURRING_LAST_BATCH_KEY]);
  });
  // Ensure we report at least the batch count when driver omits changes
  void deleteTransactionsByBatch;
  return deleted;
}
