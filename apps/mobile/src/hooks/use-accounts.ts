/**
 * Loads accounts with calculated balances and EUR equivalents.
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { listAccountsWithBalances, type AccountWithBalance } from '@/db/repositories/accounts-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { convertToEur, getLatestRatesToEur } from '@/utils/currency';

export interface AccountListItem extends AccountWithBalance {
  eurEquivalent: number;
  rateMissing: boolean;
}

export interface UseAccountsResult {
  items: AccountListItem[];
  loading: boolean;
  totalEur: number;
  hasMissingRates: boolean;
}

export function useAccounts(): UseAccountsResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [items, setItems] = useState<AccountListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [accounts, rates] = await Promise.all([listAccountsWithBalances(db), getLatestRatesToEur(db)]);
    const nextItems = accounts.map((account) => {
      const conversion = convertToEur(account.balance, account.currency, rates);
      return { ...account, eurEquivalent: conversion.amountEur, rateMissing: conversion.rateMissing };
    });
    setItems(nextItems);
    setLoading(false);
  }, [db]);

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

  const totalEur = useMemo(() => items.reduce((sum, item) => sum + item.eurEquivalent, 0), [items]);
  const hasMissingRates = useMemo(() => items.some((item) => item.rateMissing), [items]);

  return { items, loading, totalEur, hasMissingRates };
}