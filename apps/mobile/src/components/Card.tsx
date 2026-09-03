import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { rounded, spacing } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export type CardVariant = 'content' | 'sage' | 'green' | 'dark';

export interface CardProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const getVariantStyles = (colors: ThemeColors, isDark: boolean): Record<CardVariant, { backgroundColor: string }> => ({
  content: { backgroundColor: colors.canvas },
  sage: { backgroundColor: colors.canvasSoft },
  green: { backgroundColor: colors.primaryPale },
  dark: { backgroundColor: isDark ? colors.canvas : colors.ink },
});

export function Card({ variant = 'content', style, children }: CardProps) {
  const { colors, isDark } = useTheme();
  const variantStyle = useMemo(() => getVariantStyles(colors, isDark)[variant], [colors, isDark, variant]);
  return (
    <View style={[styles.base, { backgroundColor: variantStyle.backgroundColor }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: rounded.xl,
    padding: spacing.xl,
  },
});
