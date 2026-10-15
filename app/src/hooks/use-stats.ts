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
  resolveStatsRange,
  sumNetTotalsEur,
  type CategorySegment,
  type MonthlyDatum,
  type NetSummary,
  type StatsPeriod,
  type StatsPeriodRange,
} from '@/utils/stats';

export interface StatsPeriodControl {
  period: StatsPeriod;
  onPeriodChange: (period: StatsPeriod) => void;
  customRange: StatsPeriodRange;
  onCustomRangeChange: (range: StatsPeriodRange) => void;
}

function useStatsPeriodControl(initialPeriod: StatsPeriod): StatsPeriodControl {
  const [period, setPeriod] = useState(initialPeriod);
  const [customRange, setCustomRange] = useState(() => getStatsPeriodRange('month', todayIso()));
  return useMemo(
    () => ({ period, onPeriodChange: setPeriod, customRange, onCustomRangeChange: setCustomRange }),
    [period, customRange],
  );
}

export interface UseStatsResult {
  netPeriod: StatsPeriodControl;
  monthlyPeriod: StatsPeriodControl;
  categoryPeriod: StatsPeriodControl;
  net: NetSummary;
  monthlySeries: MonthlyDatum[];
  breakdown: CategorySegment[];
  hasMissingRates: boolean;
  loading: boolean;
}

export function useStats(): UseStatsResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const netPeriod = useStatsPeriodControl('month');
  const monthlyPeriod = useStatsPeriodControl('sixMonths');
  const categoryPeriod = useStatsPeriodControl('month');
  const [net, setNet] = useState<NetSummary>({ income: 0, expense: 0, investment: 0 });
  const [monthlySeries, setMonthlySeries] = useState<MonthlyDatum[]>([]);
  const [breakdown, setBreakdown] = useState<CategorySegment[]>([]);
  const [hasMissingRates, setHasMissingRates] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const today = todayIso();
    const netRange = resolveStatsRange(netPeriod.period, netPeriod.customRange, today);
    const monthlyRange = resolveStatsRange(monthlyPeriod.period, monthlyPeriod.customRange, today);
    const categoryRange = resolveStatsRange(categoryPeriod.period, categoryPeriod.customRange, today);
    const rates = await getLatestRatesToEur(db);
    const [netRows, monthlyRows, categoryRows] = await Promise.all([
      sumTotalsByTypeAndCurrency(db, netRange.fromDate, netRange.toDate),
      sumMonthlyTotalsByTypeAndCurrency(db, monthlyRange.fromDate, monthlyRange.toDate),
      sumExpenseTotalsByCategory(db, categoryRange.fromDate, categoryRange.toDate),
    ]);
    const monthKeys = getMonthKeys(monthlyRange.fromDate, monthlyRange.toDate, today.slice(0, 7));
    return {
      net: sumNetTotalsEur(netRows, rates),
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
    monthlyPeriod,
    categoryPeriod,
    net,
    monthlySeries,
    breakdown,
    hasMissingRates,
    loading,
  };
}
