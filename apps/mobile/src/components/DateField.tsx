import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { dateToIso, formatDateEs, isoToDate, todayIso } from '@/utils/dates';

export interface DateFieldProps {
  label: string;
  /** ISO `YYYY-MM-DD`; null renders the placeholder and enables clearing. */
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  /** Whether to show the clear button when a value is set. Default true. */
  clearable?: boolean;
}

export function DateField({ label, value, onChange, placeholder = 'Selecciona…', clearable = true }: DateFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={() => setShowPicker(true)} style={styles.dateField}>
          <Text style={[styles.dateValue, value === null && styles.placeholder]}>
            {value ? formatDateEs(value) : placeholder}
          </Text>
          <MaterialCommunityIcons name="calendar" size={20} color={colors.ink} />
        </Pressable>
        {value !== null && clearable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${label.toLowerCase()}`}
            onPress={() => onChange(null)}
            style={styles.clearButton}>
            <MaterialCommunityIcons name="close" size={20} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
      {showPicker ? (
        <DateTimePicker
          value={isoToDate(value ?? todayIso())}
          onValueChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) {
              onChange(dateToIso(selectedDate));
            }
          }}
          onDismiss={() => setShowPicker(false)}
          mode="date"
          presentation="dialog"
        />
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    field: {
      gap: spacing.xs,
    },
    label: {
      ...typography.bodySmStrong,
      color: colors.ink,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    dateField: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.canvas,
      borderWidth: 1,
      borderColor: colors.mute,
      borderRadius: rounded.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    dateValue: {
      ...typography.bodyMd,
      color: colors.ink,
    },
    placeholder: {
      color: colors.mute,
    },
    clearButton: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.canvas,
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: rounded.full,
      padding: spacing.sm,
    },
  });
