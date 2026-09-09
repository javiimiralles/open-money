/**
 * Loads transactions for the Movimientos tab with infinite scroll (20 by 20).
 * Supports optional filters (US-004) and derives day groups + summary.
 * When `limit` is provided (dashboard recent movements), loads a single
 * page without pagination to preserve the previous behavior.
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import {
  listTransactions,
  listTransactionsFiltered,
  summarizeTransactionsFiltered,
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

export const TRANSACTIONS_PAGE_SIZE = 20;

export interface UseTransactionsResult {
  items: TransactionWithDetails[];
  groups: TransactionDayGroup[];
  summary: TransactionSummary;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export function useTransactions(filters?: TransactionFilters, limit?: number): UseTransactionsResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [items, setItems] = useState<TransactionWithDetails[]>([]);
  const [summary, setSummary] = useState<TransactionSummary>({ count: 0, net: 0, currency: null, mixedCurrencies: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const paginated = filters !== undefined && limit === undefined;

  const loadFirstPage = useCallback(async () => {
    if (paginated && filters) {
      const [firstPage, total] = await Promise.all([
        listTransactionsFiltered(db, filters, { limit: TRANSACTIONS_PAGE_SIZE, offset: 0 }),
        summarizeTransactionsFiltered(db, filters),
      ]);
      setItems(firstPage);
      setSummary({ count: total.count, net: total.net, currency: total.currency, mixedCurrencies: total.mixedCurrencies });
      setHasMore(firstPage.length < total.count);
    } else {
      const transactions = filters ? await listTransactionsFiltered(db, filters) : await listTransactions(db, limit);
      setItems(transactions);
      setHasMore(false);
    }
    setLoading(false);
  }, [db, filters, limit, paginated]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadingMore(false);
      loadFirstPage().catch(() => {
        if (active) {
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [loadFirstPage]),
  );

  const loadMore = useCallback(() => {
    if (!paginated || !filters || loading || loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    const offset = items.length;
    listTransactionsFiltered(db, filters, { limit: TRANSACTIONS_PAGE_SIZE, offset })
      .then((nextPage) => {
        setItems((previous) => [...previous, ...nextPage]);
        if (nextPage.length < TRANSACTIONS_PAGE_SIZE) {
          setHasMore(false);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        setLoadingMore(false);
      });
  }, [db, filters, paginated, items.length, loading, loadingMore, hasMore]);

  const groups = useMemo(() => groupByDay(items), [items]);
  const singleShotSummary = useMemo(() => summarizeTransactions(items), [items]);

  return { items, groups, summary: paginated ? summary : singleShotSummary, loading, loadingMore, hasMore, loadMore };
}