import { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAccountForm } from '@/hooks/use-account-form';
import { ACCOUNT_COLORS } from '@/theme/account-colors';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'SEK', 'MXN', 'COP', 'ARS'];

export default function AccountFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const accountId = params.id ? Number(params.id) : null;
  const form = useAccountForm(accountId);

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
        'No se puede eliminar la cuenta',
        `La cuenta está en uso por ${result.recurringRules} regla(s) recurrente(s) activa(s). Reasigna o elimina esas reglas antes de borrarla.`,
      );
      return;
    }
    const linked: string[] = [];
    if (result.transactions > 0) {
      linked.push(`${result.transactions} movimiento(s)`);
    }
    if (result.trades > 0) {
      linked.push(`${result.trades} operación(es)`);
    }
    const message =
      linked.length > 0
        ? `La cuenta tiene ${linked.join(' y ')} que se eliminarán también. ¿Continuar?`
        : '¿Eliminar esta cuenta?';
    Alert.alert('Eliminar cuenta', message, [
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
      <Stack.Screen options={{ title: form.isEditing ? 'Editar cuenta' : 'Nueva cuenta' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <TextField
            label="Nombre"
            value={form.values.name}
            onChangeText={form.setName}
            placeholder="Ej. Banco Santander"
            error={form.errors.name}
          />
          <TextField
            label="Identificador (opcional)"
            value={form.values.identifier}
            onChangeText={form.setIdentifier}
            placeholder="Ej. ES91 2100 0418 4502 0005 1332"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.field}>
            <Text style={styles.label}>Divisa</Text>
            <View style={styles.currencyRow}>
              {CURRENCIES.map((code) => {
                const selected = form.values.currency === code;
                return (
                  <Pressable
                    key={code}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => form.setCurrency(code)}
                    style={[styles.currencyChip, selected && styles.currencyChipSelected]}>
                    <Text style={[styles.currencyChipText, selected && styles.currencyChipTextSelected]}>{code}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <TextField
            label="Saldo inicial"
            value={form.values.initialBalance}
            onChangeText={form.setInitialBalance}
            placeholder="0,00"
            keyboardType="decimal-pad"
            error={form.errors.initialBalance}
          />
          <View style={styles.field}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sin color"
                accessibilityState={{ selected: form.values.color === null }}
                onPress={() => form.setColor(null)}
                style={[styles.colorSwatchNone, form.values.color === null && styles.colorSwatchSelected]}
              />
              {ACCOUNT_COLORS.map((color) => {
                const selected = form.values.color === color;
                return (
                  <Pressable
                    key={color}
                    accessibilityRole="button"
                    accessibilityLabel={`Color ${color}`}
                    accessibilityState={{ selected }}
                    onPress={() => form.setColor(color)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      selected && styles.colorSwatchSelected,
                    ]}
                  />
                );
              })}
            </View>
          </View>
          <View style={styles.primaryRow}>
            <View style={styles.primaryText}>
              <Text style={styles.label}>Cuenta principal</Text>
              <Text style={styles.primaryHint}>Aparece la primera en el listado y preseleccionada en los movimientos.</Text>
            </View>
            <Switch
              accessibilityLabel="Cuenta principal"
              value={form.values.isPrimary}
              onValueChange={form.setIsPrimary}
              trackColor={{ false: colors.mute, true: colors.primary }}
              thumbColor={colors.ink}
            />
          </View>
          <Button
            label={form.isEditing ? 'Guardar cambios' : 'Crear cuenta'}
            loading={form.saving}
            onPress={handleSave}
          />
          {form.isEditing ? (
            <Button label="Eliminar cuenta" variant="tertiary" loading={form.deleting} onPress={handleDelete} />
          ) : null}
        </View>
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
    currencyRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    currencyChip: {
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: rounded.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    currencyChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    currencyChipText: {
      ...typography.bodySmStrong,
      color: colors.ink,
    },
    currencyChipTextSelected: {
      color: colors.onPrimary,
    },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    colorSwatch: {
      width: 40,
      height: 40,
      borderRadius: rounded.full,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorSwatchNone: {
      width: 40,
      height: 40,
      borderRadius: rounded.full,
      borderWidth: 3,
      borderColor: colors.mute,
      backgroundColor: colors.canvas,
    },
    colorSwatchSelected: {
      borderColor: colors.ink,
    },
    primaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    primaryText: {
      flex: 1,
      gap: spacing.xxs,
    },
    primaryHint: {
      ...typography.caption,
      color: colors.body,
    },
  });
