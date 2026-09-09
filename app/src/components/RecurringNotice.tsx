import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export interface RecurringNoticeProps {
  count: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function RecurringNotice({ count, onUndo, onDismiss }: RecurringNoticeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const label = count === 1 ? 'Se ha aplicado 1 movimiento recurrente' : `Se han aplicado ${count} movimientos recurrentes`;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{label}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onUndo} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>Deshacer</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" onPress={onDismiss} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    banner: {
      backgroundColor: colors.ink,
      borderRadius: rounded.xl,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      shadowColor: colors.ink,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    text: {
      ...typography.bodySmStrong,
      color: colors.white,
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    button: {
      backgroundColor: colors.white,
      borderRadius: rounded.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonText: {
      ...typography.bodySmStrong,
      color: colors.ink,
    },
    close: {
      padding: spacing.xs,
    },
    closeText: {
      ...typography.bodyMdStrong,
      color: colors.white,
    },
  });
