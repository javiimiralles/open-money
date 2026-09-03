/**
 * Runs the recurring catch-up engine on app open / foreground and exposes
 * the batch notice state with undo support.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { toSqlExecutor } from '@/db/sqlite-adapter';
import {
  getLastRecurringBatch,
  processRecurringOnOpen,
  undoLastRecurringBatch,
  type RecurringLastBatch,
} from '@/services/recurring-engine';
import { todayIso } from '@/utils/dates';

export interface UseRecurringProcessingResult {
  notice: RecurringLastBatch | null;
  processing: boolean;
  dismiss: () => Promise<void>;
  undo: () => Promise<void>;
  runNow: () => Promise<void>;
}

export function useRecurringProcessing(): UseRecurringProcessingResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [notice, setNotice] = useState<RecurringLastBatch | null>(null);
  const [processing, setProcessing] = useState(false);
  const hasRunRef = useRef(false);

  const refreshNotice = useCallback(async () => {
    const batch = await getLastRecurringBatch(db);
    setNotice(batch);
  }, [db]);

  const runNow = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const result = await processRecurringOnOpen(db, todayIso());
      if (result) {
        await refreshNotice();
      } else {
        // No new batch; still surface any pending unacknowledged batch
        await refreshNotice();
      }
    } catch {
      // Engine errors should not crash the app; notice stays as-is
    } finally {
      setProcessing(false);
    }
  }, [db, processing, refreshNotice]);

  // On mount: load pending batch and run catch-up once
  useEffect(() => {
    let active = true;
    const init = async () => {
      await refreshNotice();
      if (!hasRunRef.current) {
        hasRunRef.current = true;
        const result = await processRecurringOnOpen(db, todayIso()).catch(() => null);
        if (active && result) {
          await refreshNotice();
        }
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [db, refreshNotice]);

  // Re-run when app returns to foreground (idempotent)
  useEffect(() => {
    const handler = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        runNow();
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [runNow]);

  const dismiss = useCallback(async () => {
    // Dismiss keeps batch undoable? Spec says notice has option to undo batch.
    // Dismissing just hides it; undo is still possible via same batch until next batch.
    // For MVP: dismiss clears visual; batch remains stored until next batch or undo.
    // Here we hide locally but keep stored; alternatively clear storage.
    // We keep stored so user can still undo if they navigate away.
    setNotice(null);
  }, []);

  const undo = useCallback(async () => {
    await undoLastRecurringBatch(db);
    setNotice(null);
  }, [db]);

  return { notice, processing, dismiss, undo, runNow };
}
