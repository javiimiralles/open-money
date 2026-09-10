import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatCompactAmount, type MonthlyDatum } from '@/utils/stats';

export interface MonthlyBarsChartProps {
  data: MonthlyDatum[];
}

const PLOT_HEIGHT = 148;
const LABEL_ROW_HEIGHT = 22;
const Y_GUTTER = 46;
const RIGHT_PAD = 6;
const BAR_GAP = 3;
const TICKS = 4;

export function MonthlyBarsChart({ data }: MonthlyBarsChartProps) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (data.length === 0) {
    return null;
  }

  const width = Math.max(windowWidth - spacing.xl * 4, 200);
  const plotWidth = width - Y_GUTTER - RIGHT_PAD;
  const groupWidth = plotWidth / data.length;
  const barWidth = Math.min(Math.max(groupWidth * 0.18, 3), 12);
  const maxValue = Math.max(1, ...data.flatMap((datum) => [datum.income, datum.expense, datum.investment]));
  const height = PLOT_HEIGHT + LABEL_ROW_HEIGHT;

  const barHeight = (value: number): number => (value / maxValue) * (PLOT_HEIGHT - 8);
  const tickValues = Array.from({ length: TICKS }, (_, index) => (maxValue * index) / (TICKS - 1));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Comparativa mensual de ingresos, gastos e inversiones de ${data.length} meses`}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.positive }]} />
          <Text style={styles.legendText}>Ingresos</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.negative }]} />
          <Text style={styles.legendText}>Gastos</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.actionBlue }]} />
          <Text style={styles.legendText}>Inversiones</Text>
        </View>
      </View>
      <Svg width={width} height={height}>
        {tickValues.map((tick, index) => {
          const y = PLOT_HEIGHT - barHeight(tick);
          const baseline = index === 0;
          return (
            <G key={`tick-${index}`}>
              <Line
                x1={Y_GUTTER}
                x2={width - RIGHT_PAD}
                y1={y}
                y2={y}
                stroke={baseline ? colors.slate : colors.paper}
                strokeWidth={1}
                strokeDasharray={baseline ? undefined : '4 4'}
              />
              <SvgText
                x={Y_GUTTER - spacing.xs}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fontFamily="Inter_400Regular"
                fill={colors.slate}>
                {formatCompactAmount(tick)}
              </SvgText>
            </G>
          );
        })}
        {data.map((datum, index) => {
          const center = Y_GUTTER + groupWidth * (index + 0.5);
          const incomeHeight = barHeight(datum.income);
          const expenseHeight = barHeight(datum.expense);
          const investmentHeight = barHeight(datum.investment);
          return (
            <G key={datum.month}>
              <SvgText
                x={center}
                y={PLOT_HEIGHT + 15}
                textAnchor="middle"
                fontSize={10}
                fontFamily="Inter_400Regular"
                fill={colors.slate}>
                {datum.label}
              </SvgText>
              <Rect
                x={center - barWidth * 1.5 - BAR_GAP}
                y={PLOT_HEIGHT - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx={3}
                fill={colors.positive}
              />
              <Rect
                x={center - barWidth / 2}
                y={PLOT_HEIGHT - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx={3}
                fill={colors.negative}
              />
              <Rect
                x={center + barWidth / 2 + BAR_GAP}
                y={PLOT_HEIGHT - investmentHeight}
                width={barWidth}
                height={investmentHeight}
                rx={3}
                fill={colors.actionBlue}
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    legend: {
      flexDirection: 'row',
      gap: spacing.lg,
      paddingBottom: spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: rounded.full,
    },
    legendText: {
      ...typography.bodySm,
      color: colors.graphite,
    },
  });
