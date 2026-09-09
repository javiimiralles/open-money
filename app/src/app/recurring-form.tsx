import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { useRecurringForm, type RecurringFormType } from '@/hooks/use-recurring-form';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { rounded, spacing, typography } from '@/theme/tokens';

const TYPE_OPTIONS: { value: RecurringFormType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly' as const, label: 'Semanal' },
  { value: 'monthly' as const, label: 'Mensual' },
  { value: 'yearly' as const, label: 'Anual' },
  { value: 'every_n_days' as const, label: 'Cada N días' },
];

export default function RecurringFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const ruleId = params.id ? Number(params.id) : null;
  const form = useRecurringForm(ruleId);

  const handleSave = async () => {
    const saved = await form.save();
    if (saved) router.back();
  };

  const handleDelete = () => {
    Alert.alert('Eliminar regla', '¿Eliminar esta regla? Los movimientos ya aplicados se conservarán.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await form.remove();
          router.back();
        },
      },
    ]);
  };

  const handleToggle = async () => {
    await form.toggleActive();
  };

  return (
    <>
      <Stack.Screen options={{ title: form.isEditing ? 'Editar regla' : 'Nueva regla' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.form}>
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
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextField
            label="Importe"
            value={form.values.amount}
            onChangeText={form.setAmount}
            placeholder="0,00"
            keyboardType="decimal-pad"
            error={form.errors.amount}
          />

          <SelectField
            label={form.values.type === 'transfer' ? 'Cuenta de origen' : 'Cuenta'}
            value={form.values.accountId}
            options={form.accountOptions}
            onChange={form.setAccountId}
            placeholder="Selecciona una cuenta"
            error={form.errors.accountId}
          />

          {form.values.type === 'transfer' ? (
            <>
              <SelectField
                label="Cuenta de destino"
                value={form.values.destinationAccountId}
                options={form.accountOptions}
                onChange={form.setDestinationAccountId}
                placeholder="Selecciona la cuenta de destino"
                error={form.errors.destinationAccountId}
              />
              {form.isCrossCurrency ? (
                <>
                  <TextField
                    label="Tasa de cambio"
                    value={form.values.fxRate}
                    onChangeText={form.setFxRate}
                    placeholder="1,00"
                    keyboardType="decimal-pad"
                    error={form.errors.fxRate}
                  />
                  <TextField
                    label="Importe de destino"
                    value={form.values.destinationAmount}
                    onChangeText={form.setDestinationAmount}
                    placeholder="0,00"
                    keyboardType="decimal-pad"
                    error={form.errors.destinationAmount}
                  />
                </>
              ) : null}
            </>
          ) : (
            <SelectField
              label="Categoría (opcional)"
              value={form.values.categoryId}
              options={[{ label: 'Sin categoría', value: 0 }, ...form.categoryOptions]}
              onChange={form.setCategoryId}
            />
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Frecuencia</Text>
            <View style={styles.typeRow}>
              {FREQUENCY_OPTIONS.map((option) => {
                const selected = form.values.frequency === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => form.setFrequency(option.value)}
                    style={[styles.freqChip, selected && styles.typeChipSelected]}>
                    <Text style={[styles.freqChipText, selected && styles.typeChipTextSelected]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {form.errors.frequency ? <Text style={styles.error}>{form.errors.frequency}</Text> : null}
          </View>

          {form.values.frequency === 'every_n_days' ? (
            <TextField
              label="Cada cuántos días"
              value={form.values.intervalDays}
              onChangeText={form.setIntervalDays}
              placeholder="Ej. 14"
              keyboardType="number-pad"
              error={form.errors.intervalDays}
            />
          ) : null}

          <DateField
            label="Próxima ejecución"
            value={form.values.nextExecution}
            onChange={(iso) => {
              if (iso !== null) form.setNextExecution(iso);
            }}
            clearable={false}
          />
          {form.errors.nextExecution ? <Text style={styles.error}>{form.errors.nextExecution}</Text> : null}

          <View style={styles.switchRow}>
            <Text style={styles.label}>Activa</Text>
            <Switch value={form.values.active} onValueChange={form.setActive} trackColor={{ true: colors.ink, false: colors.paper }} thumbColor={colors.ink} />
          </View>

          <TextField label="Notas (opcional)" value={form.values.notes} onChangeText={form.setNotes} placeholder="Ej. Alquiler, suscripción…" />

          <Button label={form.isEditing ? 'Guardar cambios' : 'Crear regla'} loading={form.saving} onPress={handleSave} />

          {form.isEditing ? (
            <>
              <Button label={form.values.active ? 'Pausar regla' : 'Reanudar regla'} variant="secondary" loading={form.toggling} onPress={handleToggle} />
              <Button label="Eliminar regla" variant="tertiary" loading={form.deleting} onPress={handleDelete} />
            </>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  form: {
    gap: spacing.lg,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    minWidth: 96,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: rounded.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  typeChipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  typeChipText: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  typeChipTextSelected: {
    color: colors.white,
  },
  freqChip: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: rounded.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  freqChipText: {
    ...typography.bodySmStrong,
    color: colors.ink,
  },
  error: {
    ...typography.caption,
    color: colors.negativeDarkest,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
