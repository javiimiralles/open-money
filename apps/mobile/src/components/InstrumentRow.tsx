import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { InstrumentListItem } from '@/hooks/use-instruments';
import { colors, rounded, spacing, typography } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';

export interface InstrumentRowProps {
  item: InstrumentListItem;
  onPress: () => void;
}

export function InstrumentRow({ item, onPress }: InstrumentRowProps) {
  const { position } = item;
  const kindLabel = item.kind === 'etf' ? 'ETF' : item.kind === 'crypto' ? 'Cripto' : 'Acción';

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
      <View style={styles.position}>
        {position.quantity > 0 ? (
          <>
            <Text style={styles.quantity}>
              {position.quantity} · PM {formatMoney(position.avgCost, item.currency)}
            </Text>
            <Text style={styles.invested}>Invertido: {formatMoney(position.invested, item.currency)}</Text>
          </>
        ) : (
          <Text style={styles.empty}>Sin posición</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  invested: {
    ...typography.caption,
    color: colors.mute,
  },
  empty: {
    ...typography.caption,
    color: colors.mute,
  },
});
