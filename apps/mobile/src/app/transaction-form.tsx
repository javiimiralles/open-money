import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { useTransactionForm } from '@/hooks/use-transaction-form';
import { colors, rounded, spacing, typography } from '@/theme/tokens';
import { dateToIso, formatDateEs, isoToDate } from '@/utils/dates';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
] as const;

export default function TransactionFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const transactionId = params.id ? Number(params.id) : null;
  const form = useTransactionForm(transactionId);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    const saved = await form.save();
    if (saved) {
      router.back();
    }
  };

  const handleDelete = () => {
    Alert.alert('Eliminar movimiento', '¿Eliminar este movimiento?', [
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

  return (
    <>
      <Stack.Screen options={{ title: form.isEditing ? 'Editar movimiento' : 'Nuevo movimiento' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card>
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
                      <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Fecha</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowDatePicker(true)}
                style={styles.dateField}>
                <Text style={styles.dateValue}>{formatDateEs(form.values.date)}</Text>
                <MaterialCommunityIcons name="calendar" size={20} color={colors.ink} />
              </Pressable>
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
              label="Cuenta"
              value={form.values.accountId}
              options={form.accountOptions}
              onChange={form.setAccountId}
              placeholder="Selecciona una cuenta"
              error={form.errors.accountId}
            />
            <SelectField
              label="Categoría (opcional)"
              value={form.values.categoryId}
              options={[{ label: 'Sin categoría', value: 0 }, ...form.categoryOptions]}
              onChange={form.setCategoryId}
            />
            <TextField
              label="Notas (opcional)"
              value={form.values.notes}
              onChangeText={form.setNotes}
              placeholder="Ej. Supermercado semanal"
            />
            <Button
              label={form.isEditing ? 'Guardar cambios' : 'Guardar movimiento'}
              loading={form.saving}
              onPress={handleSave}
            />
            {form.isEditing ? (
              <Button label="Eliminar movimiento" variant="tertiary" loading={form.deleting} onPress={handleDelete} />
            ) : null}
          </View>
        </Card>
      </ScrollView>
      {showDatePicker ? (
        <DateTimePicker
          value={isoToDate(form.values.date)}
          onValueChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              form.setDate(dateToIso(selectedDate));
            }
          }}
          onDismiss={() => setShowDatePicker(false)}
          mode="date"
          presentation="dialog"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: rounded.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dateValue: {
    ...typography.bodyMd,
    color: colors.ink,
  },
});