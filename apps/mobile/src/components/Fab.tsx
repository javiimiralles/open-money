import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { rounded } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export interface FabProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Fab({ onPress, style }: FabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Nuevo movimiento"
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}>
      <MaterialCommunityIcons name="plus" size={28} color={colors.onPrimary} />
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      width: 56,
      height: 56,
      borderRadius: rounded.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.ink,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    pressed: {
      opacity: 0.85,
    },
  });
