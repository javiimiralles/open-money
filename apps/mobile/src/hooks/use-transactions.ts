/**
 * Loads recent transactions (newest first) for the Movimientos tab.
 * US-004 will extend this with grouping, filters, and summaries.
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { listTransactions, type TransactionWithDetails } from '@/db/repositories/transactions-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';

export interface UseTransactionsResult {
  items: TransactionWithDetails[];
  loading: boolean;
}

export function useTransactions(limit?: number): UseTransactionsResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [items, setItems] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const transactions = await listTransactions(db, limit);
    setItems(transactions);
    setLoading(false);
  }, [db, limit]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load().catch(() => {
        if (active) {
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  return { items, loading };
}