/**
 * Backup and export actions for the Settings screen (US-013).
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { toSqlExecutor } from '@/db/sqlite-adapter';
import { dumpAllTables, getSchemaVersion, replaceAllTables } from '@/db/repositories/backup-repo';
import { listTransactions } from '@/db/repositories/transactions-repo';
import { pickTextFile, shareTextFile, SharingUnavailableError } from '@/services/file-io';
import { BackupValidationError, parseBackup, serializeBackup } from '@/utils/backup';
import { buildTransactionsCsv } from '@/utils/csv';

export type BackupBusyAction = 'export-json' | 'import-json' | 'export-csv' | null;

export interface UseBackupResult {
  busy: BackupBusyAction;
  message: string | null;
  error: string | null;
  exportBackup: () => Promise<void>;
  requestImportBackup: () => void;
  exportCsv: () => Promise<void>;
}

function filenameTimestamp(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export function useBackup(onImported: () => void): UseBackupResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [busy, setBusy] = useState<BackupBusyAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportBackup = useCallback(async () => {
    setBusy('export-json');
    setMessage(null);
    setError(null);
    try {
      const file = await dumpAllTables(db);
      await shareTextFile(
        `open-money-backup-${filenameTimestamp(new Date())}.json`,
        serializeBackup(file),
        'application/json',
        'Exportar copia de seguridad',
      );
      setMessage('Copia de seguridad generada. Elige dónde guardarla.');
    } catch (actionError) {
      setError(
        actionError instanceof SharingUnavailableError
          ? 'No se pueden compartir archivos en este dispositivo.'
          : 'No se pudo generar la copia de seguridad.',
      );
    } finally {
      setBusy(null);
    }
  }, [db]);

  const importBackup = useCallback(async () => {
    setBusy('import-json');
    setMessage(null);
    setError(null);
    try {
      const contents = await pickTextFile();
      if (contents === null) {
        return;
      }
      const file = parseBackup(contents, await getSchemaVersion(db));
      await replaceAllTables(db, file);
      onImported();
      setMessage('Copia de seguridad importada correctamente.');
    } catch (actionError) {
      setError(
        actionError instanceof BackupValidationError
          ? actionError.message
          : 'No se pudo importar la copia de seguridad.',
      );
    } finally {
      setBusy(null);
    }
  }, [db, onImported]);

  const requestImportBackup = useCallback(() => {
    setMessage(null);
    setError(null);
    Alert.alert(
      'Importar copia de seguridad',
      'Se reemplazarán todos los datos actuales por los del fichero. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reemplazar datos', style: 'destructive', onPress: () => void importBackup() },
      ],
    );
  }, [importBackup]);

  const exportCsv = useCallback(async () => {
    setBusy('export-csv');
    setMessage(null);
    setError(null);
    try {
      const transactions = await listTransactions(db);
      await shareTextFile(
        `open-money-transactions-${filenameTimestamp(new Date())}.csv`,
        buildTransactionsCsv(transactions),
        'text/csv',
        'Exportar movimientos',
      );
      setMessage('CSV de movimientos generado. Elige dónde guardarlo.');
    } catch (actionError) {
      setError(
        actionError instanceof SharingUnavailableError
          ? 'No se pueden compartir archivos en este dispositivo.'
          : 'No se pudo generar el CSV de movimientos.',
      );
    } finally {
      setBusy(null);
    }
  }, [db]);

  return { busy, message, error, exportBackup, requestImportBackup, exportCsv };
}
