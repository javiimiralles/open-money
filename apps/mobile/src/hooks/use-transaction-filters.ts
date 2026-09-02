/**
 * Filter state for the transactions screen plus the account/category options
 * used by the filter panel. Sentinel values (0 / 'all') represent "no filter".
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { listAccountsWithBalances, type AccountWithBalance } from '@/db/repositories/accounts-repo';
import { getAllCategories, type Category } from '@/db/repositories/categories-repo';
import type { TransactionFilters, TransactionType } from '@/db/repositories/transactions-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { formatDateEs } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export type FilterType = TransactionType | 'all';

export interface TransactionFilterState {
  type: FilterType;
  accountId: number | null;
  categoryId: number | null;
  fromDate: string | null;
  toDate: string | null;
  search: string;
}

export interface UseTransactionFiltersResult {
  state: TransactionFilterState;
  query: TransactionFilters;
  activeCount: number;
  activeLabels: string[];
  accounts: AccountWithBalance[];
  accountOptions: { label: string; value: number }[];
  categories: Category[];
  categoryOptions: { label: string; value: number }[];
  setType: (type: FilterType) => void;
  setAccountId: (accountId: number | null) => void;
  setCategoryId: (categoryId: number | null) => void;
  setFromDate: (fromDate: string | null) => void;
  setToDate: (toDate: string | null) => void;
  setSearch: (search: string) => void;
  reset: () => void;
}

const TYPE_LABELS: Record<FilterType, string> = {
  all: 'Todos',
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
};

const INITIAL_STATE: TransactionFilterState = {
  type: 'all',
  accountId: null,
  categoryId: null,
  fromDate: null,
  toDate: null,
  search: '',
};

export function useTransactionFilters(): UseTransactionFiltersResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [state, setState] = useState<TransactionFilterState>(INITIAL_STATE);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([listAccountsWithBalances(db), getAllCategories(db)]).then(([accountRows, categoryRows]) => {
        if (!active) {
          return;
        }
        setAccounts(accountRows);
        setCategories(categoryRows);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const setType = useCallback((type: FilterType) => setState((s) => ({ ...s, type })), []);
  const setAccountId = useCallback((accountId: number | null) => setState((s) => ({ ...s, accountId })), []);
  const setCategoryId = useCallback((categoryId: number | null) => setState((s) => ({ ...s, categoryId })), []);
  const setFromDate = useCallback((fromDate: string | null) => setState((s) => ({ ...s, fromDate })), []);
  const setToDate = useCallback((toDate: string | null) => setState((s) => ({ ...s, toDate })), []);
  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, search })), []);
  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const query = useMemo<TransactionFilters>(
    () => ({
      type: state.type,
      accountId: state.accountId,
      categoryId: state.categoryId,
      fromDate: state.fromDate,
      toDate: state.toDate,
      search: state.search.trim() === '' ? null : state.search.trim(),
    }),
    [state],
  );

  const activeCount =
    (state.type !== 'all' ? 1 : 0) +
    (state.accountId !== null ? 1 : 0) +
    (state.categoryId !== null ? 1 : 0) +
    (state.fromDate !== null ? 1 : 0) +
    (state.toDate !== null ? 1 : 0) +
    (state.search.trim() !== '' ? 1 : 0);

  const activeLabels = useMemo(() => {
    const labels: string[] = [];
    if (state.type !== 'all') {
      labels.push(TYPE_LABELS[state.type]);
    }
    if (state.accountId !== null) {
      const account = accounts.find((a) => a.id === state.accountId);
      if (account) {
        labels.push(account.name);
      }
    }
    if (state.categoryId !== null) {
      const category = categories.find((c) => c.id === state.categoryId);
      if (category) {
        labels.push(category.name);
      }
    }
    if (state.fromDate !== null) {
      labels.push(`Desde ${formatDateEs(state.fromDate)}`);
    }
    if (state.toDate !== null) {
      labels.push(`Hasta ${formatDateEs(state.toDate)}`);
    }
    if (state.search.trim() !== '') {
      labels.push(`«${state.search.trim()}»`);
    }
    return labels;
  }, [state, accounts, categories]);

  const accountOptions = useMemo(
    () => [
      { label: 'Todas las cuentas', value: 0 },
      ...accounts.map((account) => ({
        label: `${account.name} · ${formatMoney(account.balance, account.currency)}`,
        value: account.id,
      })),
    ],
    [accounts],
  );

  const categoryOptions = useMemo(
    () => [
      { label: 'Todas las categorías', value: 0 },
      ...categories.map((category) => ({ label: category.name, value: category.id })),
    ],
    [categories],
  );

  return {
    state,
    query,
    activeCount,
    activeLabels,
    accounts,
    accountOptions,
    categories,
    categoryOptions,
    setType,
    setAccountId,
    setCategoryId,
    setFromDate,
    setToDate,
    setSearch,
    reset,
  };
}