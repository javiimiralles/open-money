/**
 * Loads saved instruments with their average-cost positions (US-010).
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { toSqlExecutor } from '@/db/sqlite-adapter';
import { listInstruments, type Instrument } from '@/db/repositories/instruments-repo';
import { listTradesByInstrument } from '@/db/repositories/trades-repo';
import { computePosition, type PositionSummary } from '@/utils/positions';

export interface InstrumentListItem extends Instrument {
  position: PositionSummary;
}

export interface UseInstrumentsResult {
  items: InstrumentListItem[];
  loading: boolean;
}

export function useInstruments(): UseInstrumentsResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [items, setItems] = useState<InstrumentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const instruments = await listInstruments(db);
    const withPositions = await Promise.all(
      instruments.map(async (instrument) => {
        const trades = await listTradesByInstrument(db, instrument.id);
        return { ...instrument, position: computePosition(trades) };
      }),
    );
    setItems(withPositions);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load().catch(() => {
        if (active) {
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  return { items, loading };
}
