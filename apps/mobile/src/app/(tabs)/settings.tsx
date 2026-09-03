import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { getBackendSettings, saveBackendSettings } from '@/db/repositories/settings-repo';
import { useBackup } from '@/hooks/use-backup';
import { isValidBackendUrl, testConnection, type ConnectionTestResult } from '@/services/api-client';
import { spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors, type ThemeMode } from '@/theme/theme';

type TestState = 'idle' | 'loading' | 'done';

const THEME_OPTIONS: SelectOption<ThemeMode>[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>('idle');
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    getBackendSettings(db).then((settings) => {
      if (active) {
        setBackendUrl(settings.backendUrl);
        setApiKey(settings.apiKey);
      }
    });
    return () => {
      active = false;
    };
  }, [db]);

  const handleBackupImported = useCallback(() => {
    getBackendSettings(db).then((settings) => {
      setBackendUrl(settings.backendUrl);
      setApiKey(settings.apiKey);
    });
  }, [db]);
  const backup = useBackup(handleBackupImported);

  const handleSave = async () => {
    const trimmedUrl = backendUrl.trim();
    if (trimmedUrl && !isValidBackendUrl(trimmedUrl)) {
      setUrlError('Introduce una URL válida (http:// o https://).');
      return;
    }
    setUrlError(null);
    setSaveError(null);
    try {
      await saveBackendSettings(db, { backendUrl: trimmedUrl, apiKey: apiKey.trim() });
      setSaved(true);
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
      }
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('No se pudo guardar la configuración.');
    }
  };

  const handleTestConnection = async () => {
    setTestState('loading');
    setTestResult(null);
    const result = await testConnection(db, fetch, {
      backendUrl: backendUrl.trim(),
      apiKey: apiKey.trim(),
    });
    setTestResult(result);
    setTestState('done');
  };

  const resultColor = testResult?.ok ? colors.positiveDeep : colors.negativeDarkest;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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

      <Text style={styles.sectionTitle}>Backend de datos de mercado</Text>
      <Card variant="sage">
        <Text style={styles.description}>
          Configura la URL y la API key del backend de datos de mercado. La app funciona sin él; solo las
          funciones de mercado (búsqueda de instrumentos y cotizaciones) lo necesitan.
        </Text>
      </Card>

      <Card>
        <View style={styles.form}>
          <TextField
            label="URL del backend"
            value={backendUrl}
            onChangeText={setBackendUrl}
            placeholder="https://api.ejemplo.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={urlError}
          />
          <TextField
            label="API key"
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Tu API key"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Button label="Guardar" onPress={handleSave} />
          {saved ? <Text style={styles.savedText}>Configuración guardada.</Text> : null}
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
        </View>
      </Card>

      <Card>
        <View style={styles.form}>
          <Button
            label="Probar conexión"
            variant="secondary"
            loading={testState === 'loading'}
            onPress={handleTestConnection}
          />
          {testState === 'done' && testResult ? (
            <Text style={[styles.testResult, { color: resultColor }]}>{testResult.message}</Text>
          ) : null}
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
    testResult: {
      ...typography.bodySmStrong,
    },
  });
