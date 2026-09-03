/**
 * Buy/sell form state, validation, and save (US-010).
 *
 * The price is entered in the funding account currency: trade totals move
 * the account balance directly, with no FX conversion.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getAccountById,
  listAccountsWithBalances,
  type AccountWithBalance,
} from '@/db/repositories/accounts-repo';
import { getInstrumentById, updateLastPrice, type Instrument } from '@/db/repositories/instruments-repo';
import {
  insertTrade,
  listTradesByInstrument,
  type TradeWithDetails,
} from '@/db/repositories/trades-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { todayIso } from '@/utils/dates';
import { formatMoney, parseAmount } from '@/utils/money';
import { computePosition, holdingsAtDate } from '@/utils/positions';

export type TradeFormType = 'buy' | 'sell';

export interface TradeFormValues {
  type: TradeFormType;
  date: string;
  accountId: number | null;
  quantity: string;
  price: string;
  notes: string;
}

export interface TradeFormErrors {
  quantity?: string;
  price?: string;
  accountId?: string;
}

export interface UseTradeFormResult {
  values: TradeFormValues;
  errors: TradeFormErrors;
  instrument: Instrument | null;
  accounts: AccountWithBalance[];
  accountOptions: { label: string; value: number }[];
  accountCurrency: string | null;
  holdings: number;
  total: number | null;
  loading: boolean;
  saving: boolean;
  setType: (type: TradeFormType) => void;
  setDate: (date: string) => void;
  setAccountId: (accountId: number) => void;
  setQuantity: (value: string) => void;
  setPrice: (value: string) => void;
  setNotes: (value: string) => void;
  save: () => Promise<boolean>;
}

function formatQuantity(value: number): string {
  return String(Number(value.toFixed(6)));
}

export function useTradeForm(instrumentId: number, initialType: TradeFormType = 'buy'): UseTradeFormResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [values, setValues] = useState<TradeFormValues>({
    type: initialType,
    date: todayIso(),
    accountId: null,
    quantity: '',
    price: '',
    notes: '',
  });
  const [errors, setErrors] = useState<TradeFormErrors>({});
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [trades, setTrades] = useState<TradeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getInstrumentById(db, instrumentId),
      listAccountsWithBalances(db),
      listTradesByInstrument(db, instrumentId),
    ]).then(([instrumentRow, accountRows, tradeRows]) => {
      if (!active) return;
      setInstrument(instrumentRow);
      setAccounts(accountRows);
      setTrades(tradeRows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [db, instrumentId]);

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        label: `${account.name} · ${formatMoney(account.balance, account.currency)}`,
        value: account.id,
      })),
    [accounts],
  );

  const accountCurrency = useMemo(() => {
    const account = accounts.find((candidate) => candidate.id === values.accountId);
    return account ? account.currency : null;
  }, [accounts, values.accountId]);

  const holdings = useMemo(() => computePosition(trades).quantity, [trades]);

  const total = useMemo(() => {
    const quantity = parseAmount(values.quantity);
    const price = parseAmount(values.price);
    if (quantity === null || price === null || quantity <= 0 || price <= 0) {
      return null;
    }
    return quantity * price;
  }, [values.quantity, values.price]);

  const validate = useCallback((): TradeFormErrors => {
    const next: TradeFormErrors = {};
    const quantity = parseAmount(values.quantity);
    if (values.quantity.trim() === '' || quantity === null) {
      next.quantity = 'Introduce una cantidad válida.';
    } else if (quantity <= 0) {
      next.quantity = 'La cantidad debe ser mayor que 0.';
    }
    const price = parseAmount(values.price);
    if (values.price.trim() === '' || price === null) {
      next.price = 'Introduce un precio válido.';
    } else if (price <= 0) {
      next.price = 'El precio debe ser mayor que 0.';
    }
    if (values.accountId === null) {
      next.accountId = 'Selecciona una cuenta.';
    }
    if (values.type === 'sell' && quantity !== null && quantity > 0) {
      const candidate = { date: values.date, type: 'sell' as const, quantity, price: price ?? 0 };
      const prospective = computePosition([...trades, candidate]);
      if (prospective.negativeAt !== null) {
        const available = holdingsAtDate(trades, values.date);
        next.quantity = `No dispones de esa cantidad (disponible: ${formatQuantity(available)}).`;
      }
    }
    return next;
  }, [values, trades]);

  const save = useCallback(async (): Promise<boolean> => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    if (values.accountId === null) return false;

    const account = await getAccountById(db, values.accountId);
    if (!account || !instrument) return false;

    const quantity = parseAmount(values.quantity) ?? 0;
    const price = parseAmount(values.price) ?? 0;

    setSaving(true);
    try {
      await insertTrade(db, {
        instrumentId,
        type: values.type,
        date: values.date,
        quantity,
        price,
        currency: account.currency,
        accountId: values.accountId,
        notes: values.notes.trim() || null,
      });
      await updateLastPrice(db, instrumentId, price, values.date);
      return true;
    } finally {
      setSaving(false);
    }
  }, [db, instrumentId, instrument, values, validate]);

  return {
    values,
    errors,
    instrument,
    accounts,
    accountOptions,
    accountCurrency,
    holdings,
    total,
    loading,
    saving,
    setType: (type: TradeFormType) => setValues((v) => ({ ...v, type })),
    setDate: (date: string) => setValues((v) => ({ ...v, date })),
    setAccountId: (accountId: number) => setValues((v) => ({ ...v, accountId })),
    setQuantity: (quantity: string) => setValues((v) => ({ ...v, quantity })),
    setPrice: (price: string) => setValues((v) => ({ ...v, price })),
    setNotes: (notes: string) => setValues((v) => ({ ...v, notes })),
    save,
  };
}
