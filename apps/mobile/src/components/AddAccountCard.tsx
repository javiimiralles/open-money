import { useMemo } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export interface AddAccountCardProps {
  onPress: () => void;
}

export function AddAccountCard({ onPress }: AddAccountCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Añadir cuenta"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <MaterialCommunityIcons name="plus" size={24} color={colors.ink} />
      <Text style={styles.label}>Añadir cuenta</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexGrow: 1,
      minHeight: 100,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.canvas,
      borderRadius: rounded.xl,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.mute,
      padding: spacing.xl,
      gap: spacing.md,
    },
    cardPressed: {
      opacity: 0.85,
    },
    label: {
      ...typography.bodyMdStrong,
      color: colors.ink,
      textAlign: 'center',
    },
  });
