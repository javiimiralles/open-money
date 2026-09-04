import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export interface SelectOption<T extends string | number> {
  label: string;
  value: T;
  /** Optional MaterialCommunityIcons name shown before the label. */
  icon?: string | null;
}

export interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | null;
}

// Option icons arrive as plain strings; the glyph component expects its
// generated name union, hence the single cast here.
function SelectOptionIcon({ name, color }: { name: string; color: string }) {
  return (
    <MaterialCommunityIcons
      name={name as ComponentProps<typeof MaterialCommunityIcons>['name']}
      size={20}
      color={color}
    />
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecciona…',
  error,
}: SelectFieldProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={[styles.field, error ? styles.fieldError : null]}>
        {selected?.icon ? (
          <SelectOptionIcon name={selected.icon} color={colors.ink} />
        ) : null}
        <Text style={[styles.value, !selected ? styles.placeholder : null]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.ink} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {open ? (
        <View style={styles.options}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={[styles.option, isSelected ? styles.optionSelected : null]}>
                {option.icon ? <SelectOptionIcon name={option.icon} color={colors.ink} /> : null}
                <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]} numberOfLines={1}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: spacing.xs,
    },
    label: {
      ...typography.bodySmStrong,
      color: colors.ink,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: colors.canvas,
      borderWidth: 1,
      borderColor: colors.mute,
      borderRadius: rounded.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    fieldError: {
      borderColor: colors.negative,
    },
    value: {
      ...typography.bodyMd,
      color: colors.ink,
      flexShrink: 1,
    },
    placeholder: {
      color: colors.mute,
    },
    error: {
      ...typography.caption,
      color: colors.negativeDarkest,
    },
    options: {
      borderWidth: 1,
      borderColor: colors.mute,
      borderRadius: rounded.xl,
      overflow: 'hidden',
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.canvas,
    },
    optionSelected: {
      backgroundColor: colors.primaryPale,
    },
    optionText: {
      ...typography.bodyMd,
      color: colors.ink,
    },
    optionTextSelected: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
  });
