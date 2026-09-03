import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PortfolioItem } from '@/hooks/use-portfolio';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatDateEs } from '@/utils/dates';
import { formatMoney, formatPercent } from '@/utils/money';

export interface PortfolioRowProps {
  item: PortfolioItem;
  onPress: () => void;
}

export function PortfolioRow({ item, onPress }: PortfolioRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { position, values } = item;
  const kindLabel = item.kind === 'etf' ? 'ETF' : item.kind === 'crypto' ? 'Cripto' : 'Acción';
  const pnlColor =
    values.pnlEur === null ? colors.mute : values.pnlEur >= 0 ? colors.positiveDeep : colors.negativeDarkest;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.symbol}>
          {item.symbol} · {kindLabel} · {item.currency}
        </Text>
      </View>
      {position.quantity > 0 ? (
        <View style={styles.position}>
          <Text style={styles.quantity}>
            {position.quantity} · PM {formatMoney(position.avgCost, item.currency)}
          </Text>
          <Text style={styles.lastPrice}>
            {item.lastPrice !== null
              ? `Último: ${formatMoney(item.lastPrice, item.currency)}${item.lastPriceAt ? ` (${formatDateEs(item.lastPriceAt.slice(0, 10))})` : ''}`
              : 'Sin precio conocido'}
          </Text>
          <View style={styles.valuationRow}>
            <Text style={styles.valueLabel}>Valor</Text>
            <Text style={styles.value}>
              {values.valueEur !== null ? formatMoney(values.valueEur, 'EUR') : '—'}
            </Text>
          </View>
          <Text style={[styles.pnl, { color: pnlColor }]}>
            {values.pnlEur !== null && values.pnlPct !== null
              ? `${values.pnlEur >= 0 ? '+' : ''}${formatMoney(values.pnlEur, 'EUR')} (${formatPercent(values.pnlPct)})`
              : 'P&L no disponible'}
          </Text>
        </View>
      ) : (
        <Text style={styles.empty}>Sin posición</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.canvas,
      borderRadius: rounded.xl,
      padding: spacing.xl,
      gap: spacing.md,
    },
    cardPressed: {
      opacity: 0.85,
    },
    header: {
      gap: spacing.xxs,
    },
    name: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
    symbol: {
      ...typography.caption,
      color: colors.mute,
    },
    position: {
      gap: spacing.xxs,
    },
    quantity: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
    lastPrice: {
      ...typography.caption,
      color: colors.mute,
    },
    valuationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    valueLabel: {
      ...typography.bodySm,
      color: colors.body,
    },
    value: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
    pnl: {
      ...typography.bodySmStrong,
    },
    empty: {
      ...typography.caption,
      color: colors.mute,
    },
  });
