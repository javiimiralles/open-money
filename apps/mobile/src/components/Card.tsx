import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, rounded, spacing } from '@/theme/tokens';

export type CardVariant = 'content' | 'sage' | 'green' | 'dark';

export interface CardProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, { backgroundColor: string; textColor: string }> = {
  content: { backgroundColor: colors.canvas, textColor: colors.ink },
  sage: { backgroundColor: colors.canvasSoft, textColor: colors.ink },
  green: { backgroundColor: colors.primaryPale, textColor: colors.ink },
  dark: { backgroundColor: colors.ink, textColor: colors.primary },
};

export function Card({ variant = 'content', style, children }: CardProps) {
  const variantStyle = variantStyles[variant];
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