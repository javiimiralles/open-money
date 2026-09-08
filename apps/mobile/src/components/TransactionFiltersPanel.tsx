import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { DateField } from '@/components/DateField';
import { SelectField } from '@/components/SelectField';
import type { FilterType } from '@/hooks/use-transaction-filters';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

const TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'investment', label: 'Inversión' },
  { value: 'transfer', label: 'Transferencia' },
];

export interface TransactionFiltersPanelProps {
  type: FilterType;
  onTypeChange: (type: FilterType) => void;
  accountId: number | null;
  accountOptions: { label: string; value: number }[];
  /** Receives the raw option value; 0 means "all accounts". */
  onAccountChange: (accountId: number) => void;
  categoryId: number | null;
  categoryOptions: { label: string; value: number }[];
  /** Receives the raw option value; 0 means "all categories". */
  onCategoryChange: (categoryId: number) => void;
  fromDate: string | null;
  toDate: string | null;
  onFromDateChange: (date: string | null) => void;
  onToDateChange: (date: string | null) => void;
}

export function TransactionFiltersPanel({
  type,
  onTypeChange,
  accountId,
  accountOptions,
  onAccountChange,
  categoryId,
  categoryOptions,
  onCategoryChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: TransactionFiltersPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Card>
      <View style={styles.container}>
        <View style={styles.field}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((option) => {
              const selected = type === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onTypeChange(option.value)}
                  style={[styles.typeChip, selected && styles.typeChipSelected]}>
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <SelectField
          label="Cuenta"
          value={accountId ?? 0}
          options={accountOptions}
          onChange={onAccountChange}
          placeholder="Todas las cuentas"
        />
        <SelectField
          label="Categoría"
          value={categoryId ?? 0}
          options={categoryOptions}
          onChange={onCategoryChange}
          placeholder="Todas las categorías"
        />
        <View style={styles.datesRow}>
          <View style={styles.datesColumn}>
            <DateField label="Desde" value={fromDate} onChange={onFromDateChange} />
          </View>
          <View style={styles.datesColumn}>
            <DateField label="Hasta" value={toDate} onChange={onToDateChange} />
          </View>
        </View>
      </View>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: spacing.lg,
    },
    field: {
      gap: spacing.xs,
    },
    label: {
      ...typography.bodySmStrong,
      color: colors.ink,
    },
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    typeChip: {
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: rounded.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    typeChipSelected: {
      backgroundColor: colors.ink,
      borderColor: colors.ink,
    },
    typeChipText: {
      ...typography.bodySmStrong,
      color: colors.ink,
    },
    typeChipTextSelected: {
      color: colors.white,
    },
    datesRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    datesColumn: {
      flex: 1,
    },
  });
