/**
 * Instrument search and manual entry (US-010).
 *
 * Online search goes through the market backend; manual entry is always
 * available (offline or asset not found). Crypto is hidden for now.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { toSqlExecutor } from '@/db/sqlite-adapter';
import { upsertInstrument } from '@/db/repositories/instruments-repo';
import {
  BackendNotConfiguredError,
  searchInstruments,
  type InstrumentSearchResult,
} from '@/services/api-client';

export type ManualInstrumentKind = 'stock' | 'etf';

export interface ManualInstrumentValues {
  symbol: string;
  name: string;
  currency: string;
  market: string;
  isin: string;
  kind: ManualInstrumentKind;
}

export interface ManualInstrumentErrors {
  symbol?: string;
  name?: string;
  currency?: string;
}

export interface UseInstrumentSearchResult {
  query: string;
  results: InstrumentSearchResult[];
  searching: boolean;
  searchError: string | null;
  hasSearched: boolean;
  setQuery: (value: string) => void;
  search: () => Promise<void>;
  selectResult: (result: InstrumentSearchResult) => Promise<number>;
  manual: ManualInstrumentValues;
  manualErrors: ManualInstrumentErrors;
  saving: boolean;
  setManualSymbol: (value: string) => void;
  setManualName: (value: string) => void;
  setManualCurrency: (value: string) => void;
  setManualMarket: (value: string) => void;
  setManualIsin: (value: string) => void;
  setManualKind: (kind: ManualInstrumentKind) => void;
  saveManual: () => Promise<number | null>;
}

export function useInstrumentSearch(): UseInstrumentSearchResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstrumentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [manual, setManual] = useState<ManualInstrumentValues>({
    symbol: '',
    name: '',
    currency: 'EUR',
    market: '',
    isin: '',
    kind: 'stock',
  });
  const [manualErrors, setManualErrors] = useState<ManualInstrumentErrors>({});
  const [saving, setSaving] = useState(false);

  const search = useCallback(async (): Promise<void> => {
    if (query.trim() === '' || searching) {
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const found = await searchInstruments(db, query);
      setResults(found);
      setHasSearched(true);
    } catch (error) {
      setResults([]);
      setHasSearched(true);
      if (error instanceof BackendNotConfiguredError) {
        setSearchError('Configura el backend en Ajustes para buscar. Puedes añadir el instrumento manualmente.');
      } else {
        setSearchError(error instanceof Error ? error.message : 'No se pudo buscar.');
      }
    } finally {
      setSearching(false);
    }
  }, [db, query, searching]);

  const selectResult = useCallback(
    async (result: InstrumentSearchResult): Promise<number> => {
      return upsertInstrument(db, {
        symbol: result.symbol,
        name: result.name,
        currency: result.currency,
        market: result.market,
        isin: result.isin,
        kind: result.kind,
      });
    },
    [db],
  );

  const validateManual = useCallback((values: ManualInstrumentValues): ManualInstrumentErrors => {
    const next: ManualInstrumentErrors = {};
    if (values.symbol.trim() === '') {
      next.symbol = 'Introduce el ticker o símbolo.';
    }
    if (values.name.trim() === '') {
      next.name = 'Introduce el nombre.';
    }
    if (!/^[A-Za-z]{3}$/.test(values.currency.trim())) {
      next.currency = 'Introduce un código de divisa de 3 letras.';
    }
    return next;
  }, []);

  const saveManual = useCallback(async (): Promise<number | null> => {
    const nextErrors = validateManual(manual);
    setManualErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return null;
    }
    setSaving(true);
    try {
      return await upsertInstrument(db, {
        symbol: manual.symbol.trim().toUpperCase(),
        name: manual.name.trim(),
        currency: manual.currency.trim().toUpperCase(),
        market: manual.market.trim() || null,
        isin: manual.isin.trim() || null,
        kind: manual.kind,
      });
    } finally {
      setSaving(false);
    }
  }, [db, manual, validateManual]);

  return {
    query,
    results,
    searching,
    searchError,
    hasSearched,
    setQuery: (value: string) => setQuery(value),
    search,
    selectResult,
    manual,
    manualErrors,
    saving,
    setManualSymbol: (symbol: string) => setManual((v) => ({ ...v, symbol })),
    setManualName: (name: string) => setManual((v) => ({ ...v, name })),
    setManualCurrency: (currency: string) => setManual((v) => ({ ...v, currency })),
    setManualMarket: (market: string) => setManual((v) => ({ ...v, market })),
    setManualIsin: (isin: string) => setManual((v) => ({ ...v, isin })),
    setManualKind: (kind: ManualInstrumentKind) => setManual((v) => ({ ...v, kind })),
    saveManual,
  };
}
