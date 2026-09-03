import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateField } from '@/components/DateField';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { useTradeForm, type TradeFormType } from '@/hooks/use-trade-form';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { rounded, spacing, typography } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';

const TYPE_OPTIONS: { value: TradeFormType; label: string }[] = [
  { value: 'buy', label: 'Compra' },
  { value: 'sell', label: 'Venta' },
];

export default function TradeFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ instrumentId?: string; type?: string }>();
  const instrumentId = params.instrumentId ? Number(params.instrumentId) : 0;
  const form = useTradeForm(instrumentId, params.type === 'sell' ? 'sell' : 'buy');
  const isSell = form.values.type === 'sell';

  const handleSave = async () => {
    const saved = await form.save();
    if (saved) {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: isSell ? 'Registrar venta' : 'Registrar compra' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {!form.loading && !form.instrument ? (
          <Card>
            <Text style={styles.empty}>Instrumento no encontrado.</Text>
          </Card>
        ) : (
          <Card>
            <View style={styles.form}>
              {form.instrument ? (
                <Text style={styles.instrument}>
                  {form.instrument.name} · {form.instrument.symbol}
                </Text>
              ) : null}
              <View style={styles.field}>
                <Text style={styles.label}>Tipo</Text>
                <View style={styles.typeRow}>
                  {TYPE_OPTIONS.map((option) => {
                    const selected = form.values.type === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => form.setType(option.value)}
                        style={[styles.typeChip, selected && styles.typeChipSelected]}>
                        <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <DateField
                label="Fecha"
                value={form.values.date}
                onChange={(iso) => {
                  if (iso !== null) {
                    form.setDate(iso);
                  }
                }}
                clearable={false}
              />
              <SelectField
                label="Cuenta"
                value={form.values.accountId}
                options={form.accountOptions}
                onChange={form.setAccountId}
                placeholder="Selecciona una cuenta"
                error={form.errors.accountId}
              />
              <TextField
                label="Cantidad"
                value={form.values.quantity}
                onChangeText={form.setQuantity}
                placeholder="0"
                keyboardType="decimal-pad"
                error={form.errors.quantity}
              />
              <TextField
                label={`Precio (en ${form.accountCurrency ?? 'la divisa de la cuenta'})`}
                value={form.values.price}
                onChangeText={form.setPrice}
                placeholder="0,00"
                keyboardType="decimal-pad"
                error={form.errors.price}
              />
              {form.holdings > 0 ? (
                <Text style={styles.holdings}>En cartera: {form.holdings}</Text>
              ) : null}
              {form.total !== null && form.accountCurrency ? (
                <Text style={styles.total}>Total: {formatMoney(form.total, form.accountCurrency)}</Text>
              ) : null}
              <TextField
                label="Notas (opcional)"
                value={form.values.notes}
                onChangeText={form.setNotes}
                placeholder="Ej. Compra mensual"
              />
              <Button
                label={isSell ? 'Guardar venta' : 'Guardar compra'}
                loading={form.saving}
                onPress={handleSave}
              />
            </View>
          </Card>
        )}
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
  instrument: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodySmStrong,
    color: colors.ink,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: rounded.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  typeChipTextSelected: {
    color: colors.onPrimary,
  },
  holdings: {
    ...typography.bodySm,
    color: colors.mute,
  },
  total: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  empty: {
    ...typography.bodyMd,
    color: colors.body,
  },
});
