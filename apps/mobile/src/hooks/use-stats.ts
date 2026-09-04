/**
 * Statistics screen data: net balance, monthly comparison, and category
 * breakdown. Totals are consolidated to EUR using the stored rates.
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import {
  sumExpenseTotalsByCategory,
  sumMonthlyTotalsByTypeAndCurrency,
  sumTotalsByTypeAndCurrency,
} from '@/db/repositories/transactions-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { getLatestRatesToEur } from '@/utils/currency';
import { todayIso } from '@/utils/dates';
import {
  buildCategoryBreakdown,
  buildMonthlySeries,
  detectMissingRates,
  getMonthKeys,
  getStatsPeriodRange,
  sumIncomeExpenseEur,
  type CategorySegment,
  type MonthlyDatum,
  type NetSummary,
  type StatsPeriod,
} from '@/utils/stats';

export interface UseStatsResult {
  netPeriod: StatsPeriod;
  setNetPeriod: (period: StatsPeriod) => void;
  monthlyPeriod: StatsPeriod;
  setMonthlyPeriod: (period: StatsPeriod) => void;
  categoryPeriod: StatsPeriod;
  setCategoryPeriod: (period: StatsPeriod) => void;
  net: NetSummary;
  monthlySeries: MonthlyDatum[];
  breakdown: CategorySegment[];
  hasMissingRates: boolean;
  loading: boolean;
}

export function useStats(): UseStatsResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [netPeriod, setNetPeriod] = useState<StatsPeriod>('month');
  const [monthlyPeriod, setMonthlyPeriod] = useState<StatsPeriod>('sixMonths');
  const [categoryPeriod, setCategoryPeriod] = useState<StatsPeriod>('month');
  const [net, setNet] = useState<NetSummary>({ income: 0, expense: 0 });
  const [monthlySeries, setMonthlySeries] = useState<MonthlyDatum[]>([]);
  const [breakdown, setBreakdown] = useState<CategorySegment[]>([]);
  const [hasMissingRates, setHasMissingRates] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const today = todayIso();
    const netRange = getStatsPeriodRange(netPeriod, today);
    const monthlyRange = getStatsPeriodRange(monthlyPeriod, today);
    const categoryRange = getStatsPeriodRange(categoryPeriod, today);
    const rates = await getLatestRatesToEur(db);
    const [netRows, monthlyRows, categoryRows] = await Promise.all([
      sumTotalsByTypeAndCurrency(db, netRange.fromDate, netRange.toDate),
      sumMonthlyTotalsByTypeAndCurrency(db, monthlyRange.fromDate, monthlyRange.toDate),
      sumExpenseTotalsByCategory(db, categoryRange.fromDate, categoryRange.toDate),
    ]);
    const monthKeys = getMonthKeys(monthlyRange.fromDate, monthlyRange.toDate);
    return {
      net: sumIncomeExpenseEur(netRows, rates),
      monthlySeries: buildMonthlySeries(monthlyRows, rates, monthKeys),
      breakdown: buildCategoryBreakdown(categoryRows, rates),
      hasMissingRates: detectMissingRates([...netRows, ...monthlyRows, ...categoryRows], rates),
    };
  }, [db, netPeriod, monthlyPeriod, categoryPeriod]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load()
        .then((result) => {
          if (!active) {
            return;
          }
          setNet(result.net);
          setMonthlySeries(result.monthlySeries);
          setBreakdown(result.breakdown);
          setHasMissingRates(result.hasMissingRates);
          setLoading(false);
        })
        .catch(() => {
          if (active) {
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  return {
    netPeriod,
    setNetPeriod,
    monthlyPeriod,
    setMonthlyPeriod,
    categoryPeriod,
    setCategoryPeriod,
    net,
    monthlySeries,
    breakdown,
    hasMissingRates,
    loading,
  };
}
