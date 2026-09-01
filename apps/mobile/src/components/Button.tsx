import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, rounded, spacing, typography } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  label: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<ButtonVariant, { backgroundColor: string; textColor: string; borderColor?: string }> = {
  primary: { backgroundColor: colors.primary, textColor: colors.onPrimary },
  secondary: { backgroundColor: colors.canvasSoft, textColor: colors.ink },
  tertiary: { backgroundColor: colors.canvas, textColor: colors.ink, borderColor: colors.ink },
};

export function Button({ variant = 'primary', label, loading = false, disabled, style, ...props }: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          opacity: pressed ? 0.85 : isDisabled ? 0.5 : 1,
        },
        style,
      ]}
      {...props}>
      <Text style={[styles.label, { color: variantStyle.textColor }]}>{loading ? '…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: rounded.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 48,
  },
  label: {
    ...typography.buttonMd,
  },
});