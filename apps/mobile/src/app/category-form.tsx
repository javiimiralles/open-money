import { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import type { CategoryKind } from '@/db/repositories/categories-repo';
import { useCategoryForm } from '@/hooks/use-category-form';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
];

export default function CategoryFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const categoryId = params.id ? Number(params.id) : null;
  const form = useCategoryForm(categoryId);

  const handleSave = async () => {
    const saved = await form.save();
    if (saved) {
      router.back();
    }
  };

  const handleDelete = async () => {
    const result = await form.requestDelete();
    if (result.status === 'blocked') {
      Alert.alert(
        'No se puede eliminar la categoría',
        `La categoría está en uso por ${result.recurringRules} regla(s) recurrente(s) activa(s). Reasigna o elimina esas reglas antes de borrarla.`,
      );
      return;
    }
    const message =
      result.transactions > 0
        ? `Los ${result.transactions} movimiento(s) de esta categoría pasarán a "Sin categoría". ¿Continuar?`
        : '¿Eliminar esta categoría?';
    Alert.alert('Eliminar categoría', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await form.performDelete();
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: form.isEditing ? 'Editar categoría' : 'Nueva categoría' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.form}>
            <TextField
              label="Nombre"
              value={form.values.name}
              onChangeText={form.setName}
              placeholder="Ej. Caprichos"
              error={form.errors.name}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.kindRow}>
                {KINDS.map((kind) => {
                  const selected = form.values.kind === kind.value;
                  return (
                    <Pressable
                      key={kind.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => form.setKind(kind.value)}
                      style={[styles.kindChip, selected && styles.kindChipSelected]}>
                      <Text style={[styles.kindChipText, selected && styles.kindChipTextSelected]}>
                        {kind.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Button
              label={form.isEditing ? 'Guardar cambios' : 'Crear categoría'}
              loading={form.saving}
              onPress={handleSave}
            />
            {form.isEditing ? (
              <Button label="Eliminar categoría" variant="tertiary" loading={form.deleting} onPress={handleDelete} />
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    kindRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    kindChip: {
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: rounded.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    kindChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    kindChipText: {
      ...typography.bodySmStrong,
      color: colors.ink,
    },
    kindChipTextSelected: {
      color: colors.onPrimary,
    },
  });
