import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: rounded.pill,
      backgroundColor: colors.paper,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    optionSelected: {
      backgroundColor: colors.ink,
    },
    optionText: {
      ...typography.bodySmStrong,
      color: colors.graphite,
    },
    optionTextSelected: {
      color: colors.white,
    },
    pressed: {
      opacity: 0.7,
    },
  });
