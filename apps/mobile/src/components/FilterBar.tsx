import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/TextField';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

export interface FilterBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  activeCount: number;
  activeLabels: string[];
  panelOpen: boolean;
  onTogglePanel: () => void;
  onClear: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  activeCount,
  activeLabels,
  panelOpen,
  onTogglePanel,
  onClear,
}: FilterBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const filtersActive = panelOpen || activeCount > 0;
  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <TextField
            value={search}
            onChangeText={onSearchChange}
            placeholder="Buscar en notas…"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtros"
          accessibilityState={{ selected: filtersActive }}
          onPress={onTogglePanel}
          style={({ pressed }) => [
            styles.filterButton,
            filtersActive && styles.filterButtonActive,
            pressed && styles.pressed,
          ]}>
          <MaterialCommunityIcons name="tune" size={24} color={filtersActive ? colors.onPrimary : colors.ink} />
        </Pressable>
      </View>
      {activeCount > 0 ? (
        <View style={styles.chips}>
          {activeLabels.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpiar filtros"
            onPress={onClear}
            style={({ pressed }) => [styles.chip, styles.clearChip, pressed && styles.pressed]}>
            <Text style={[styles.chipText, styles.clearChipText]}>Limpiar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    searchField: {
      flex: 1,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: rounded.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.canvasSoft,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
    },
    pressed: {
      opacity: 0.7,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      backgroundColor: colors.primaryPale,
      borderRadius: rounded.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    clearChip: {
      backgroundColor: colors.canvasSoft,
      borderWidth: 1,
      borderColor: colors.mute,
    },
    chipText: {
      ...typography.bodySmStrong,
      color: colors.inkDeep,
    },
    clearChipText: {
      color: colors.body,
    },
  });
