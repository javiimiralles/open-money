import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { rounded, spacing } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export type CardVariant = 'content' | 'sage' | 'green';

export interface CardProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const getVariantStyles = (colors: ThemeColors): Record<CardVariant, { backgroundColor: string }> => ({
  content: { backgroundColor: colors.white },
  sage: { backgroundColor: colors.paper },
  green: { backgroundColor: colors.infoBannerBg },
});

export function Card({ variant = 'content', style, children }: CardProps) {
  const { colors } = useTheme();
  const variantStyle = useMemo(() => getVariantStyles(colors)[variant], [colors, variant]);
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
