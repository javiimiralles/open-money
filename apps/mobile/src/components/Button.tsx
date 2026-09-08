import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  label: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const getVariantStyles = (
  colors: ThemeColors,
): Record<ButtonVariant, { backgroundColor: string; textColor: string; borderColor?: string }> => ({
  primary: { backgroundColor: colors.ink, textColor: colors.white },
  secondary: { backgroundColor: colors.paper, textColor: colors.ink, borderColor: colors.silver },
  tertiary: { backgroundColor: colors.white, textColor: colors.ink, borderColor: colors.silver },
});

export function Button({ variant = 'primary', label, loading = false, disabled, style, ...props }: ButtonProps) {
  const { colors } = useTheme();
  const variantStyle = useMemo(() => getVariantStyles(colors)[variant], [colors, variant]);
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
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 36,
  },
  label: {
    ...typography.buttonMd,
  },
});
