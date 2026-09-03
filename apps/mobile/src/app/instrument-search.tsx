import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { useInstrumentSearch, type ManualInstrumentKind } from '@/hooks/use-instrument-search';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { rounded, spacing, typography } from '@/theme/tokens';

const KIND_OPTIONS: { value: ManualInstrumentKind; label: string }[] = [
  { value: 'stock', label: 'Acción' },
  { value: 'etf', label: 'ETF' },
];

export default function InstrumentSearchScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const form = useInstrumentSearch();

  const handleSelect = async (symbol: string) => {
    const result = form.results.find((candidate) => candidate.symbol === symbol);
    if (!result) {
      return;
    }
    await form.selectResult(result);
    router.back();
  };

  const handleSaveManual = async () => {
    const id = await form.saveManual();
    if (id !== null) {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Añadir instrumento' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.form}>
            <TextField
              label="Buscar por nombre, ticker o ISIN"
              value={form.query}
              onChangeText={form.setQuery}
              placeholder="Ej. Santander, SAN.MC…"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                void form.search();
              }}
            />
            <Button label="Buscar" loading={form.searching} onPress={() => void form.search()} />
            {form.searchError ? <Text style={styles.error}>{form.searchError}</Text> : null}
            {form.hasSearched && !form.searchError && form.results.length === 0 ? (
              <Text style={styles.empty}>Sin resultados. Prueba con la entrada manual.</Text>
            ) : null}
            {form.results.map((result) => (
              <Pressable
                key={result.symbol}
                accessibilityRole="button"
                onPress={() => void handleSelect(result.symbol)}
                style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {result.name}
                </Text>
                <Text style={styles.resultMeta}>
                  {result.symbol} · {result.currency}
                  {result.market ? ` · ${result.market}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
        <Card>
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Entrada manual</Text>
            <TextField
              label="Símbolo o ticker"
              value={form.manual.symbol}
              onChangeText={form.setManualSymbol}
              placeholder="Ej. SAN.MC"
              autoCapitalize="characters"
              autoCorrect={false}
              error={form.manualErrors.symbol}
            />
            <TextField
              label="Nombre"
              value={form.manual.name}
              onChangeText={form.setManualName}
              placeholder="Ej. Banco Santander"
              error={form.manualErrors.name}
            />
            <TextField
              label="Divisa"
              value={form.manual.currency}
              onChangeText={form.setManualCurrency}
              placeholder="EUR"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={3}
              error={form.manualErrors.currency}
            />
            <TextField
              label="Mercado (opcional)"
              value={form.manual.market}
              onChangeText={form.setManualMarket}
              placeholder="Ej. BME"
            />
            <TextField
              label="ISIN (opcional)"
              value={form.manual.isin}
              onChangeText={form.setManualIsin}
              placeholder="Ej. ES0113900J37"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.kindRow}>
                {KIND_OPTIONS.map((option) => {
                  const selected = form.manual.kind === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => form.setManualKind(option.value)}
                      style={[styles.kindChip, selected && styles.kindChipSelected]}>
                      <Text style={[styles.kindChipText, selected && styles.kindChipTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Button label="Guardar instrumento" loading={form.saving} onPress={() => void handleSaveManual()} />
          </View>
        </Card>
      </ScrollView>
    </>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvasSoft,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  error: {
    ...typography.bodySm,
    color: colors.negativeDeep,
  },
  empty: {
    ...typography.bodySm,
    color: colors.mute,
  },
  result: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: rounded.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xxs,
    backgroundColor: colors.canvas,
  },
  resultPressed: {
    opacity: 0.85,
  },
  resultName: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  resultMeta: {
    ...typography.caption,
    color: colors.mute,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodySmStrong,
    color: colors.ink,
  },
  kindRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kindChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: rounded.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  kindChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  kindChipText: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  kindChipTextSelected: {
    color: colors.onPrimary,
  },
});
