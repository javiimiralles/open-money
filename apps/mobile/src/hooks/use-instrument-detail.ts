/**
 * Loads an instrument with its average-cost position and trade history
 * for the detail screen (US-010).
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { toSqlExecutor } from '@/db/sqlite-adapter';
import { getInstrumentById, type Instrument } from '@/db/repositories/instruments-repo';
import { listTradesByInstrument, type TradeWithDetails } from '@/db/repositories/trades-repo';
import { computePosition, type PositionSummary } from '@/utils/positions';

export interface UseInstrumentDetailResult {
  instrument: Instrument | null;
  position: PositionSummary;
  trades: TradeWithDetails[];
  loading: boolean;
}

export function useInstrumentDetail(instrumentId: number): UseInstrumentDetailResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [trades, setTrades] = useState<TradeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [instrumentRow, tradeRows] = await Promise.all([
      getInstrumentById(db, instrumentId),
      listTradesByInstrument(db, instrumentId, true),
    ]);
    setInstrument(instrumentRow);
    setTrades(tradeRows);
    setLoading(false);
  }, [db, instrumentId]);

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

  const position = useMemo(() => computePosition(trades), [trades]);

  return { instrument, position, trades, loading };
}
