import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RecurringRuleWithDetails } from '@/db/repositories/recurring-rules-repo';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatDateEs } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

const TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
  every_n_days: 'Cada N días',
};

function frequencyLabel(rule: RecurringRuleWithDetails): string {
  if (rule.frequency === 'every_n_days') {
    return `Cada ${rule.intervalDays ?? '?'} días`;
  }
  return FREQUENCY_LABELS[rule.frequency] ?? rule.frequency;
}

export interface RecurringRuleRowProps {
  rule: RecurringRuleWithDetails;
  onPress: () => void;
  onToggleActive: () => void;
}

export function RecurringRuleRow({ rule, onPress, onToggleActive }: RecurringRuleRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.topRow}>
        <View style={styles.left}>
          <Text style={styles.typeLabel}>{TYPE_LABELS[rule.type] ?? rule.type}</Text>
          <Text style={styles.amount}>{formatMoney(rule.amount, rule.currency)}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {frequencyLabel(rule)} · Próxima: {formatDateEs(rule.nextExecution)}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {rule.type === 'transfer'
              ? `${rule.accountName} → ${rule.destinationAccountName ?? '?'}`
              : `${rule.accountName}${rule.categoryName ? ` · ${rule.categoryName}` : ''}`}
          </Text>
          {rule.notes ? (
            <Text style={styles.notes} numberOfLines={1}>
              {rule.notes}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>
          <View style={[styles.badge, rule.active ? styles.badgeActive : styles.badgePaused]}>
            <Text style={[styles.badgeText, rule.active ? styles.badgeTextActive : styles.badgeTextPaused]}>
              {rule.active ? 'Activa' : 'Pausada'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rule.active ? 'Pausar regla' : 'Reanudar regla'}
            onPress={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}>
            <Text style={styles.toggleText}>{rule.active ? 'Pausar' : 'Reanudar'}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.white,
      borderRadius: rounded.xl,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    rowPressed: {
      opacity: 0.85,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.lg,
    },
    left: {
      flex: 1,
      gap: spacing.xs,
    },
    right: {
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    typeLabel: {
      ...typography.bodySmStrong,
      color: colors.graphite,
    },
    amount: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
    meta: {
      ...typography.bodySm,
      color: colors.graphite,
    },
    notes: {
      ...typography.caption,
      color: colors.slate,
      fontStyle: 'italic',
    },
    badge: {
      borderRadius: rounded.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    badgeActive: {
      backgroundColor: colors.infoBannerBg,
    },
    badgePaused: {
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.slate,
    },
    badgeText: {
      ...typography.caption,
      fontWeight: '600',
    },
    badgeTextActive: {
      color: colors.positiveDeep,
    },
    badgeTextPaused: {
      color: colors.graphite,
    },
    toggle: {
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: rounded.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    togglePressed: {
      opacity: 0.7,
    },
    toggleText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.ink,
    },
  });
