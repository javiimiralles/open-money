/**
 * Dev-data actions for the Settings screen: seed a fake dataset or wipe
 * all user data. Both actions ask for confirmation first.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { clearAllDevData, seedDevData } from '@/db/dev-seed';
import { toSqlExecutor } from '@/db/sqlite-adapter';

declare const __DEV__: boolean;

export function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export type DevDataBusyAction = 'seed' | 'clear' | null;

export interface UseDevDataResult {
  busy: DevDataBusyAction;
  message: string | null;
  error: string | null;
  requestSeedDevData: () => void;
  requestClearDevData: () => void;
}

export function useDevData(): UseDevDataResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [busy, setBusy] = useState<DevDataBusyAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seed = useCallback(async () => {
    setBusy('seed');
    setMessage(null);
    setError(null);
    try {
      const summary = await seedDevData(db);
      setMessage(
        `Datos de prueba generados: ${summary.accounts} cuentas, ${summary.transactions} movimientos y ${summary.recurringRules} reglas recurrentes.`,
      );
    } catch {
      setError('No se pudieron generar los datos de prueba.');
    } finally {
      setBusy(null);
    }
  }, [db]);

  const requestSeedDevData = useCallback(() => {
    setMessage(null);
    setError(null);
    Alert.alert(
      'Generar datos de prueba',
      'Se borrarán los datos actuales y se crearán cuentas, movimientos y reglas de ejemplo para probar la app.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Generar datos', style: 'destructive', onPress: () => void seed() },
      ],
    );
  }, [seed]);

  const clear = useCallback(async () => {
    setBusy('clear');
    setMessage(null);
    setError(null);
    try {
      await clearAllDevData(db);
      setMessage('Todos los datos han sido borrados. La app está como recién instalada.');
    } catch {
      setError('No se pudieron borrar los datos.');
    } finally {
      setBusy(null);
    }
  }, [db]);

  const requestClearDevData = useCallback(() => {
    setMessage(null);
    setError(null);
    Alert.alert(
      'Borrar todos los datos',
      'Se eliminarán todas las cuentas, movimientos, reglas y tasas de cambio. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar todo', style: 'destructive', onPress: () => void clear() },
      ],
    );
  }, [clear]);

  return { busy, message, error, requestSeedDevData, requestClearDevData };
}
