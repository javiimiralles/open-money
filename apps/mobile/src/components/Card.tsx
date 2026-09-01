import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, rounded, spacing } from '@/theme/tokens';

export type CardVariant = 'content' | 'sage' | 'green' | 'dark';

export interface CardProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, { backgroundColor: string }> = {
  content: { backgroundColor: colors.canvas },
  sage: { backgroundColor: colors.canvasSoft },
  green: { backgroundColor: colors.primaryPale },
  dark: { backgroundColor: colors.ink },
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