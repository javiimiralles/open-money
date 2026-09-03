import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.mute}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    input: {
      ...typography.bodyMd,
      color: colors.ink,
      backgroundColor: colors.canvas,
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: rounded.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    inputError: {
      borderColor: colors.negative,
    },
    error: {
      ...typography.caption,
      color: colors.negativeDarkest,
    },
  });
