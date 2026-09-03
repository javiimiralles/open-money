import { StyleSheet, Text, View } from 'react-native';

import type { TradeWithDetails } from '@/db/repositories/trades-repo';
import { colors, rounded, spacing, typography } from '@/theme/tokens';
import { formatDateEs } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export interface TradeRowProps {
  trade: TradeWithDetails;
}

export function TradeRow({ trade }: TradeRowProps) {
  const isBuy = trade.type === 'buy';
  const total = trade.quantity * trade.price;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.type, isBuy ? styles.buy : styles.sell]}>{isBuy ? 'Compra' : 'Venta'}</Text>
        <Text style={styles.date}>{formatDateEs(trade.date)}</Text>
      </View>
      <Text style={styles.detail}>
        {trade.quantity} × {formatMoney(trade.price, trade.currency)} = {formatMoney(total, trade.currency)}
      </Text>
      <Text style={styles.account}>{trade.accountName}</Text>
      {trade.notes ? (
        <Text style={styles.notes} numberOfLines={2}>
          {trade.notes}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderRadius: rounded.xl,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    ...typography.bodyMdStrong,
  },
  buy: {
    color: colors.negativeDeep,
  },
  sell: {
    color: colors.positiveDeep,
  },
  date: {
    ...typography.caption,
    color: colors.mute,
  },
  detail: {
    ...typography.bodyMd,
    color: colors.ink,
  },
  account: {
    ...typography.caption,
    color: colors.mute,
  },
  notes: {
    ...typography.caption,
    color: colors.body,
  },
});
