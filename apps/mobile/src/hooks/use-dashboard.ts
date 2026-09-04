/**
 * Dashboard data: net worth, account summary, and recent transactions.
 * Net worth is the total of converted account balances in EUR.
 */

import type { TransactionWithDetails } from '@/db/repositories/transactions-repo';

import { useAccounts, type AccountListItem } from './use-accounts';
import { useTransactions } from './use-transactions';

export const DASHBOARD_RECENT_LIMIT = 15;

export interface UseDashboardResult {
  accounts: AccountListItem[];
  totalAccountsEur: number;
  netWorthEur: number;
  hasMissingRates: boolean;
  recentTransactions: TransactionWithDetails[];
  loading: boolean;
}

export function useDashboard(): UseDashboardResult {
  const { items: accounts, loading: accountsLoading, totalEur, hasMissingRates } = useAccounts();
  const { items: recentTransactions, loading: transactionsLoading } = useTransactions(
    undefined,
    DASHBOARD_RECENT_LIMIT,
  );

  return {
    accounts,
    totalAccountsEur: totalEur,
    netWorthEur: totalEur,
    hasMissingRates,
    recentTransactions,
    loading: accountsLoading || transactionsLoading,
  };
}
