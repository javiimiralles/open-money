import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { CategoryDonutChart } from '@/components/CategoryDonutChart';
import { MonthlyBarsChart } from '@/components/MonthlyBarsChart';
import { SegmentedControl, type SegmentedOption } from '@/components/SegmentedControl';
import { useStats } from '@/hooks/use-stats';
import { spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatMoney } from '@/utils/money';
import { STATS_PERIOD_LABELS, type StatsPeriod } from '@/utils/stats';

const REPORT_CURRENCY = 'EUR';

const NET_PERIOD_OPTIONS: readonly SegmentedOption<StatsPeriod>[] = [
  { label: STATS_PERIOD_LABELS.month, value: 'month' },
  { label: STATS_PERIOD_LABELS.sixMonths, value: 'sixMonths' },
  { label: STATS_PERIOD_LABELS.year, value: 'year' },
];

const MONTHLY_PERIOD_OPTIONS: readonly SegmentedOption<StatsPeriod>[] = [
  { label: STATS_PERIOD_LABELS.sixMonths, value: 'sixMonths' },
  { label: STATS_PERIOD_LABELS.year, value: 'year' },
];

const CATEGORY_PERIOD_OPTIONS: readonly SegmentedOption<StatsPeriod>[] = [
  { label: STATS_PERIOD_LABELS.month, value: 'month' },
  { label: STATS_PERIOD_LABELS.sixMonths, value: 'sixMonths' },
  { label: STATS_PERIOD_LABELS.year, value: 'year' },
];

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
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
  } = useStats();

  const netTotal = net.income - net.expense - net.investment;
  const hasNetData = net.income > 0 || net.expense > 0 || net.investment > 0;
  const hasMonthlyData = monthlySeries.some(
    (datum) => datum.income > 0 || datum.expense > 0 || datum.investment > 0,
  );
  const netColor = netTotal >= 0 ? colors.positive : colors.negative;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Estadísticas</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balance neto</Text>
          <SegmentedControl
            options={NET_PERIOD_OPTIONS}
            value={netPeriod}
            onChange={setNetPeriod}
            accessibilityLabel="Período del balance neto"
          />
          <Card>
            {loading || hasNetData ? (
              <View style={styles.netRows}>
                <View style={styles.netRow}>
                  <Text style={styles.netLabel}>Ingresos</Text>
                  <Text style={[styles.netValue, { color: colors.positive }]}>
                    {formatMoney(net.income, REPORT_CURRENCY)}
                  </Text>
                </View>
                <View style={styles.netRow}>
                  <Text style={styles.netLabel}>Gastos</Text>
                  <Text style={[styles.netValue, { color: colors.negative }]}>
                    {formatMoney(net.expense, REPORT_CURRENCY)}
                  </Text>
                </View>
                <View style={styles.netRow}>
                  <Text style={styles.netLabel}>Inversiones</Text>
                  <Text style={[styles.netValue, { color: colors.actionBlue }]}>
                    {formatMoney(net.investment, REPORT_CURRENCY)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.netRow}>
                  <Text style={styles.netTotalLabel}>Neto</Text>
                  <Text style={[styles.netTotalValue, { color: netColor }]}>
                    {formatMoney(netTotal, REPORT_CURRENCY)}
                  </Text>
                </View>
                {hasMissingRates ? (
                  <Text style={styles.rateNote}>
                    Alguna divisa no tiene tasa de cambio guardada; se muestra con tasa 1:1.
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.emptyText}>Sin movimientos en este período.</Text>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comparativa mensual</Text>
          <SegmentedControl
            options={MONTHLY_PERIOD_OPTIONS}
            value={monthlyPeriod}
            onChange={setMonthlyPeriod}
            accessibilityLabel="Período de la comparativa mensual"
          />
          <Card>
            {loading || hasMonthlyData ? (
              <MonthlyBarsChart data={monthlySeries} />
            ) : (
              <Text style={styles.emptyText}>Sin movimientos en este período.</Text>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos por categoría</Text>
          <SegmentedControl
            options={CATEGORY_PERIOD_OPTIONS}
            value={categoryPeriod}
            onChange={setCategoryPeriod}
            accessibilityLabel="Período del desglose por categoría"
          />
          <Card>
            {loading || breakdown.length > 0 ? (
              <CategoryDonutChart segments={breakdown} currency={REPORT_CURRENCY} />
            ) : (
              <Text style={styles.emptyText}>Sin gastos en este período.</Text>
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.xl,
    },
    title: {
      ...typography.displayXs,
      color: colors.ink,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
    netRows: {
      gap: spacing.sm,
    },
    netRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    netLabel: {
      ...typography.bodyMd,
      color: colors.graphite,
    },
    netValue: {
      ...typography.bodyMdStrong,
    },
    divider: {
      height: 1,
      backgroundColor: colors.paper,
    },
    netTotalLabel: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
    netTotalValue: {
      ...typography.bodyMdStrong,
    },
    rateNote: {
      ...typography.caption,
      color: colors.warningDeep,
    },
    emptyText: {
      ...typography.bodyMd,
      color: colors.graphite,
    },
  });
