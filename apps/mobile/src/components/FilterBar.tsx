import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
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
  return (
    <View style={styles.container}>
      <TextField
        value={search}
        onChangeText={onSearchChange}
        placeholder="Buscar en notas…"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.row}>
        <Button
          variant="secondary"
          label={panelOpen ? 'Ocultar filtros' : activeCount > 0 ? `Filtros (${activeCount})` : 'Filtros'}
          onPress={onTogglePanel}
          style={styles.toggleButton}
        />
        {activeCount > 0 ? (
          <Button variant="tertiary" label="Limpiar" onPress={onClear} style={styles.toggleButton} />
        ) : null}
      </View>
      {activeLabels.length > 0 ? (
        <View style={styles.chips}>
          {activeLabels.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
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
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    toggleButton: {
      flex: 1,
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
    chipText: {
      ...typography.bodySmStrong,
      color: colors.inkDeep,
    },
  });
