import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { chartColorAt } from '@/theme/chart-colors';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatMoney } from '@/utils/money';
import type { CategorySegment } from '@/utils/stats';

export interface CategoryDonutChartProps {
  segments: CategorySegment[];
  currency: string;
}

const SIZE = 184;
const STROKE = 30;
const SEGMENT_GAP = 2;

export function CategoryDonutChart({ segments, currency }: CategoryDonutChartProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const radius = (SIZE - STROKE) / 2;
  const center = SIZE / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.total, 0);

  let drawn = 0;
  const arcs = segments.map((segment, index) => {
    const color = segment.others ? colors.mute : chartColorAt(index);
    const length = Math.max(
      segment.share * circumference - (segments.length > 1 ? SEGMENT_GAP : 0),
      0,
    );
    const arc = { ...segment, color, length, offset: drawn };
    drawn += segment.share * circumference;
    return arc;
  });

  if (segments.length === 0) {
    return null;
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Desglose de gastos por categoría: ${segments
        .map((segment) => `${segment.name} ${Math.round(segment.share * 100)} %`)
        .join(', ')}`}>
      <View style={styles.donutWrap}>
        <Svg width={SIZE} height={SIZE}>
          {arcs.map((arc, index) => (
            <Circle
              key={`${arc.categoryId ?? 'null'}-${arc.name}-${index}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
              transform={`rotate(-90 ${center} ${center})`}
            />
          ))}
        </Svg>
        <View style={styles.centerLabel}>
          <Text style={styles.totalCaption}>Total</Text>
          <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(total, currency)}
          </Text>
        </View>
      </View>
      <View style={styles.legend}>
        {arcs.map((arc, index) => (
          <View key={`legend-${arc.categoryId ?? 'null'}-${arc.name}-${index}`} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: arc.color }]} />
            <Text style={styles.legendName} numberOfLines={1}>
              {arc.name}
            </Text>
            <Text style={styles.legendShare}>{`${Math.round(arc.share * 100)} %`}</Text>
            <Text style={styles.legendAmount} numberOfLines={1}>
              {formatMoney(arc.total, currency)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    donutWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    centerLabel: {
      position: 'absolute',
      alignItems: 'center',
      maxWidth: SIZE - STROKE * 2,
    },
    totalCaption: {
      ...typography.caption,
      color: colors.mute,
    },
    totalValue: {
      ...typography.displayXs,
      color: colors.ink,
      textAlign: 'center',
    },
    legend: {
      gap: spacing.sm,
      paddingTop: spacing.md,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: rounded.full,
    },
    legendName: {
      ...typography.bodySm,
      color: colors.body,
      flex: 1,
    },
    legendShare: {
      ...typography.bodySmStrong,
      color: colors.ink,
      minWidth: 44,
      textAlign: 'right',
    },
    legendAmount: {
      ...typography.bodySm,
      color: colors.ink,
      minWidth: 96,
      textAlign: 'right',
    },
  });
