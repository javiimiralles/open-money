import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TransactionWithDetails } from '@/db/repositories/transactions-repo';
import { colors, rounded, spacing, typography } from '@/theme/tokens';
import { formatDateEs } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export interface TransactionRowProps {
  transaction: TransactionWithDetails;
  onPress: () => void;
}

export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const isTransfer = transaction.type === 'transfer';
  const isIncome = transaction.type === 'income';
  const signedAmount = isIncome ? transaction.amount : -transaction.amount;

  let detail: string;
  if (isTransfer) {
    detail = `${transaction.accountName} → ${transaction.destinationAccountName ?? '?'}`;
    if (transaction.destinationAmount !== null && transaction.destinationAmount !== transaction.amount) {
      detail += ` · ${formatMoney(transaction.destinationAmount, transaction.destinationCurrency ?? transaction.currency)}`;
    }
  } else {
    detail = [transaction.accountName, transaction.categoryName].filter(Boolean).join(' · ');
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.info}>
        <Text style={styles.date}>{formatDateEs(transaction.date)}</Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          isTransfer ? styles.transfer : isIncome ? styles.income : styles.expense,
        ]}>
        {isTransfer ? formatMoney(transaction.amount, transaction.currency) : formatMoney(signedAmount, transaction.currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.canvas,
    borderRadius: rounded.xl,
    padding: spacing.xl,
  },
  cardPressed: {
    opacity: 0.85,
  },
  info: {
    flexShrink: 1,
    gap: spacing.xxs,
  },
  date: {
    ...typography.caption,
    color: colors.mute,
  },
  detail: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  amount: {
    ...typography.bodyMdStrong,
  },
  income: {
    color: colors.positiveDeep,
  },
  expense: {
    color: colors.negativeDeep,
  },
  transfer: {
    color: colors.ink,
  },
});