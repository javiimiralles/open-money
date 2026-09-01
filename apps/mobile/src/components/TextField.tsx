import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, rounded, spacing, typography } from '@/theme/tokens';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function TextField({ label, error, style, ...props }: TextFieldProps) {
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

const styles = StyleSheet.create({
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