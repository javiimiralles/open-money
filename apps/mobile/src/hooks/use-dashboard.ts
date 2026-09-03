/**
 * Dashboard data: net worth, account summary, and recent transactions (US-012).
 * Composes the existing accounts, portfolio, and transactions hooks.
 */

import { useMemo } from 'react';

import type { TransactionWithDetails } from '@/db/repositories/transactions-repo';
import { computeNetWorthEur } from '@/utils/net-worth';

import { useAccounts, type AccountListItem } from './use-accounts';
import { usePortfolio } from './use-portfolio';
import { useTransactions } from './use-transactions';

export const DASHBOARD_RECENT_LIMIT = 15;

export interface UseDashboardResult {
  accounts: AccountListItem[];
  totalAccountsEur: number;
  portfolioValueEur: number;
  netWorthEur: number;
  unpricedCount: number;
  hasMissingRates: boolean;
  recentTransactions: TransactionWithDetails[];
  loading: boolean;
}

export function useDashboard(): UseDashboardResult {
  const { items: accounts, loading: accountsLoading, totalEur, hasMissingRates: accountsMissing } = useAccounts();
  const { totals, loading: portfolioLoading } = usePortfolio();
  const { items: recentTransactions, loading: transactionsLoading } = useTransactions(
    undefined,
    DASHBOARD_RECENT_LIMIT,
  );

  const netWorthEur = useMemo(
    () => computeNetWorthEur(totalEur, totals.totalValueEur),
    [totalEur, totals.totalValueEur],
  );

  return {
    accounts,
    totalAccountsEur: totalEur,
    portfolioValueEur: totals.totalValueEur,
    netWorthEur,
    unpricedCount: totals.unpricedCount,
    hasMissingRates: accountsMissing || totals.rateMissing,
    recentTransactions,
    loading: accountsLoading || portfolioLoading || transactionsLoading,
  };
}
