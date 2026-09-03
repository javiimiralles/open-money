import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AccountListItem } from '@/hooks/use-accounts';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatMoney } from '@/utils/money';

export interface AccountRowProps {
  account: AccountListItem;
  onPress: () => void;
}

export function AccountRow({ account, onPress }: AccountRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const showEurEquivalent = account.currency !== 'EUR';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {account.name}
        </Text>
        {account.identifier ? <Text style={styles.identifier}>{account.identifier}</Text> : null}
      </View>
      <View style={styles.balances}>
        <Text style={styles.balance}>{formatMoney(account.balance, account.currency)}</Text>
        {showEurEquivalent ? (
          <Text style={styles.eurEquivalent}>
            ≈ {formatMoney(account.eurEquivalent, 'EUR')}
            {account.rateMissing ? ' · tasa no disponible' : ''}
          </Text>
        ) : null}
      </View>
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
    identifier: {
      ...typography.caption,
      color: colors.mute,
    },
    balances: {
      gap: spacing.xxs,
    },
    balance: {
      ...typography.displayXs,
      color: colors.ink,
    },
    eurEquivalent: {
      ...typography.caption,
      color: colors.mute,
    },
  });
