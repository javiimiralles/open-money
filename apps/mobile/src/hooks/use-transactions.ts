/**
 * Loads transactions for the Movimientos tab.
 * Supports optional filters (US-004) and derives day groups + summary.
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import {
  listTransactions,
  listTransactionsFiltered,
  type TransactionFilters,
  type TransactionWithDetails,
} from '@/db/repositories/transactions-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import {
  groupByDay,
  summarizeTransactions,
  type TransactionDayGroup,
  type TransactionSummary,
} from '@/utils/transaction-groups';

export interface UseTransactionsResult {
  items: TransactionWithDetails[];
  groups: TransactionDayGroup[];
  summary: TransactionSummary;
  loading: boolean;
}

export function useTransactions(filters?: TransactionFilters, limit?: number): UseTransactionsResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [items, setItems] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const transactions = filters ? await listTransactionsFiltered(db, filters) : await listTransactions(db, limit);
    setItems(transactions);
    setLoading(false);
  }, [db, filters, limit]);

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

  const groups = useMemo(() => groupByDay(items), [items]);
  const summary = useMemo(() => summarizeTransactions(items), [items]);

  return { items, groups, summary, loading };
}