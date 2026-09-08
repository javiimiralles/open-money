import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AccountListItem } from '@/hooks/use-accounts';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { pickReadableText, type ReadableTextColors } from '@/utils/color';
import { formatMoney, MONEY_MASK } from '@/utils/money';
import MaterialCommunityIcons from '@expo/vector-icons/build/MaterialCommunityIcons';

export interface AccountCardProps {
  account: AccountListItem;
  onPress: () => void;
  /** Privacy mode: masks every monetary amount on the card. */
  hidden?: boolean;
  /** Selection highlight used by form pickers; off by default. */
  selected?: boolean;
}

export function AccountCard({ account, onPress, hidden = false, selected = false }: AccountCardProps) {
  const { colors } = useTheme();
  const text = useMemo<ReadableTextColors>(
    () =>
      account.color ? pickReadableText(account.color) : { primary: colors.ink, secondary: colors.slate },
    [account.color, colors],
  );
  const styles = useMemo(
    () => makeStyles(colors, account.color, text),
    [colors, account.color, text],
  );
  const showEurEquivalent = account.currency !== 'EUR';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.cardPressed]}>
      {selected ? (
        <View style={styles.selectedBadge}>
          <MaterialCommunityIcons name="check" size={16} color={colors.white} />
        </View>
      ) : null}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {account.name}
          </Text>
          {account.isPrimary ? (
            <View style={styles.badge}>
              <MaterialCommunityIcons name='star' color={styles.badgeText.color} />
            </View>
          ) : null}
        </View>
        {account.identifier ? (
          <Text style={styles.identifier} numberOfLines={1}>
            {account.identifier}
          </Text>
        ) : null}
      </View>
      <View style={styles.balances}>
        <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
          {hidden ? MONEY_MASK : formatMoney(account.balance, account.currency)}
        </Text>
        {showEurEquivalent ? (
          <Text style={styles.eurEquivalent} numberOfLines={1}>
            {hidden
              ? '≈ ' + MONEY_MASK
              : `≈ ${formatMoney(account.eurEquivalent, 'EUR')}${account.rateMissing ? ' · tasa no disponible' : ''}`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors, background: string | null, text: ReadableTextColors) =>
  StyleSheet.create({
    card: {
      flexGrow: 1,
      minHeight: 100,
      justifyContent: 'space-between',
      backgroundColor: background ?? colors.white,
      borderRadius: rounded.xl,
      borderWidth: 2,
      borderColor: 'transparent',
      padding: spacing.xl,
      gap: spacing.md,
    },
    cardSelected: {
      borderColor: colors.ink,
    },
    cardPressed: {
      opacity: 0.85,
    },
    selectedBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.ink,
      borderRadius: rounded.full,
      padding: spacing.xxs,
    },
    header: {
      gap: spacing.xxs,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    badge: {
      backgroundColor: text.primary,
      borderRadius: rounded.full,
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.xxs,
    },
    badgeText: {
      ...typography.caption,
      color: background ?? colors.white,
    },
    name: {
      ...typography.bodyMdStrong,
      color: text.primary,
      flexShrink: 1,
    },
    identifier: {
      ...typography.caption,
      color: text.secondary,
    },
    balances: {
      gap: spacing.xxs,
    },
    balance: {
      ...typography.displayXs,
      color: text.primary,
    },
    eurEquivalent: {
      ...typography.caption,
      color: text.secondary,
    },
  });
