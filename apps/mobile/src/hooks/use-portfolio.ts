/**
 * Portfolio data: instruments with average-cost positions, EUR valuation,
 * and backend price refresh with offline last-known-price fallback (US-011).
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { toSqlExecutor } from '@/db/sqlite-adapter';
import { listInstruments, updateLastPrice, type Instrument } from '@/db/repositories/instruments-repo';
import { listTradesByInstrument } from '@/db/repositories/trades-repo';
import {
  BackendNotConfiguredError,
  BackendUnreachableError,
  fetchQuotes,
} from '@/services/api-client';
import { getLatestRatesToEur } from '@/utils/currency';
import { todayIso } from '@/utils/dates';
import {
  computePortfolioTotals,
  computePortfolioValues,
  type PortfolioTotals,
  type PortfolioValues,
} from '@/utils/portfolio';
import { computePosition, type PositionSummary } from '@/utils/positions';

export interface PortfolioItem extends Instrument {
  position: PositionSummary;
  values: PortfolioValues;
}

export interface UsePortfolioResult {
  items: PortfolioItem[];
  loading: boolean;
  totals: PortfolioTotals;
  /** Latest known price date (YYYY-MM-DD) across open positions, if any. */
  lastUpdateAt: string | null;
  refreshing: boolean;
  refreshError: string | null;
  refreshPrices: () => Promise<void>;
}

export function usePortfolio(): UsePortfolioResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [instruments, rates] = await Promise.all([listInstruments(db), getLatestRatesToEur(db)]);
    const withPositions = await Promise.all(
      instruments.map(async (instrument) => {
        const trades = await listTradesByInstrument(db, instrument.id);
        const position = computePosition(trades);
        const values = computePortfolioValues(
          {
            quantity: position.quantity,
            invested: position.invested,
            lastPrice: instrument.lastPrice,
            currency: instrument.currency,
          },
          rates,
        );
        return { ...instrument, position, values };
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

  const refreshPrices = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const symbols = items.filter((item) => item.position.quantity > 0).map((item) => item.symbol);
      if (symbols.length === 0) {
        return;
      }
      const { quotes } = await fetchQuotes(db, symbols);
      const bySymbol = new Map(items.map((item) => [item.symbol.toUpperCase(), item]));
      for (const quote of quotes) {
        const match = bySymbol.get(quote.symbol.toUpperCase());
        if (!match) {
          continue;
        }
        const date = (quote.timestamp ?? '').slice(0, 10) || todayIso();
        await updateLastPrice(db, match.id, quote.price, date);
      }
      await load();
    } catch (error) {
      if (error instanceof BackendNotConfiguredError) {
        setRefreshError('Configura el backend de datos de mercado en Ajustes para actualizar los precios.');
      } else if (error instanceof BackendUnreachableError) {
        setRefreshError(`${error.message} Se muestran los últimos precios conocidos.`);
      } else {
        setRefreshError('No se pudieron actualizar los precios. Se muestran los últimos precios conocidos.');
      }
    } finally {
      setRefreshing(false);
    }
  }, [db, items, load]);

  const totals = useMemo(
    () => computePortfolioTotals(items.map((item) => item.values)),
    [items],
  );

  const lastUpdateAt = useMemo(() => {
    let latest: string | null = null;
    for (const item of items) {
      if (item.position.quantity <= 0 || !item.lastPriceAt) {
        continue;
      }
      const date = item.lastPriceAt.slice(0, 10);
      if (latest === null || date > latest) {
        latest = date;
      }
    }
    return latest;
  }, [items]);

  return { items, loading, totals, lastUpdateAt, refreshing, refreshError, refreshPrices };
}
