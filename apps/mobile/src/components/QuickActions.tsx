import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TransactionFormType } from '@/hooks/use-transaction-form';
import { rounded, spacing } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface QuickAction {
  type: TransactionFormType;
  icon: IconName;
  accessibilityLabel: string;
}

const ACTIONS: QuickAction[] = [
  { type: 'income', icon: 'arrow-top-right', accessibilityLabel: 'Nuevo ingreso' },
  { type: 'expense', icon: 'arrow-bottom-left', accessibilityLabel: 'Nuevo gasto' },
  { type: 'investment', icon: 'trending-up', accessibilityLabel: 'Nueva inversión' },
  { type: 'transfer', icon: 'swap-horizontal', accessibilityLabel: 'Nueva transferencia' },
];

export interface QuickActionsProps {
  onSelect: (type: TransactionFormType) => void;
}

export function QuickActions({ onSelect }: QuickActionsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.type}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          onPress={() => onSelect(action.type)}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <MaterialCommunityIcons name={action.icon} size={26} color={colors.ink} />
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignSelf: 'stretch',
      paddingTop: spacing.sm,
    },
    button: {
      width: 56,
      height: 56,
      borderRadius: rounded.full,
      backgroundColor: colors.canvasSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.7,
    },
  });
