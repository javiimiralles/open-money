import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { useBackup } from '@/hooks/use-backup';
import { spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors, type ThemeMode } from '@/theme/theme';

const THEME_OPTIONS: SelectOption<ThemeMode>[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const backup = useBackup(useCallback(() => {}, []));

  return (
    <ScrollView style={[styles.screen, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Apariencia</Text>
      <Card>
        <View style={styles.form}>
          <Text style={styles.description}>
            Elige cómo se ve la app. Con «Sistema» sigue el tema de tu móvil.
          </Text>
          <SelectField label="Tema" value={mode} options={THEME_OPTIONS} onChange={(value) => void setMode(value)} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Pagos recurrentes</Text>
      <Card>
        <View style={styles.form}>
          <Text style={styles.description}>
            Crea reglas periódicas de ingresos, gastos o transferencias. Se aplican automáticamente al abrir la
            app y puedes deshacer el último lote.
          </Text>
          <Button label="Gestionar pagos recurrentes" variant="secondary" onPress={() => router.push('/recurring')} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Categorías</Text>
      <Card>
        <View style={styles.form}>
          <Text style={styles.description}>
            Crea, edita y elimina tus categorías para clasificar los movimientos como prefieras.
          </Text>
          <Button label="Gestionar categorías" variant="secondary" onPress={() => router.push('/categories')} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Copia de seguridad y exportación</Text>
      <Card>
        <View style={styles.form}>
          <Text style={styles.description}>
            Exporta una copia completa de tus datos en JSON para guardarla fuera del móvil, o impórtala
            para restaurar la app. También puedes exportar tus movimientos a CSV.
          </Text>
          <Button
            label="Exportar copia (JSON)"
            loading={backup.busy === 'export-json'}
            disabled={backup.busy !== null}
            onPress={backup.exportBackup}
          />
          <Button
            label="Importar copia (JSON)"
            variant="tertiary"
            loading={backup.busy === 'import-json'}
            disabled={backup.busy !== null}
            onPress={backup.requestImportBackup}
          />
          <Button
            label="Exportar movimientos (CSV)"
            variant="secondary"
            loading={backup.busy === 'export-csv'}
            disabled={backup.busy !== null}
            onPress={backup.exportCsv}
          />
          {backup.message ? <Text style={styles.savedText}>{backup.message}</Text> : null}
          {backup.error ? <Text style={styles.errorText}>{backup.error}</Text> : null}
        </View>
      </Card>
    </ScrollView>
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
    sectionTitle: {
      ...typography.displayXs,
      color: colors.ink,
    },
    description: {
      ...typography.bodyMd,
      color: colors.body,
    },
    form: {
      gap: spacing.lg,
    },
    savedText: {
      ...typography.bodySm,
      color: colors.positiveDeep,
    },
    errorText: {
      ...typography.bodySm,
      color: colors.negativeDarkest,
    },
  });
