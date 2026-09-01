import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { getBackendSettings, saveBackendSettings } from '@/db/repositories/settings-repo';
import { isValidBackendUrl, testConnection, type ConnectionTestResult } from '@/services/api-client';
import { colors, spacing, typography } from '@/theme/tokens';

type TestState = 'idle' | 'loading' | 'done';

export default function SettingsScreen() {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>('idle');
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleSave = async () => {
    const trimmedUrl = backendUrl.trim();
    if (trimmedUrl && !isValidBackendUrl(trimmedUrl)) {
      setUrlError('Introduce una URL válida (http:// o https://).');
      return;
    }
    setUrlError(null);
    try {
      await saveBackendSettings(db, { backendUrl: trimmedUrl, apiKey: apiKey.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
    </ScrollView>
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