/**
 * Recurring rule create/edit form state, validation, save, and delete flow.
 * Investment type is hidden in the MVP (deferred to US-010).
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAccountById, listAccountsWithBalances, type AccountWithBalance } from '@/db/repositories/accounts-repo';
import { getAllCategories, type Category } from '@/db/repositories/categories-repo';
import {
  deleteRecurringRule,
  getRecurringRuleById,
  insertRecurringRule,
  setRecurringRuleActive,
  updateRecurringRule,
  type RecurrenceFrequency,
  type RecurringRuleInput,
  type RecurringRuleType,
} from '@/db/repositories/recurring-rules-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { todayIso } from '@/utils/dates';
import { parseAmount } from '@/utils/money';
import { crossRate, destinationAmountFromRate, rateFromAmounts } from '@/utils/transfer';

export type RecurringFormType = Exclude<RecurringRuleType, 'investment'>;

export interface RecurringFormValues {
  type: RecurringFormType;
  amount: string;
  accountId: number | null;
  categoryId: number;
  destinationAccountId: number | null;
  frequency: RecurrenceFrequency | null;
  intervalDays: string;
  nextExecution: string | null;
  active: boolean;
  notes: string;
  fxRate: string;
  destinationAmount: string;
}

export interface RecurringFormErrors {
  amount?: string;
  accountId?: string;
  categoryId?: string;
  destinationAccountId?: string;
  frequency?: string;
  intervalDays?: string;
  nextExecution?: string;
  fxRate?: string;
  destinationAmount?: string;
}

export interface UseRecurringFormResult {
  values: RecurringFormValues;
  errors: RecurringFormErrors;
  accounts: AccountWithBalance[];
  accountOptions: { label: string; value: number }[];
  categoryOptions: { label: string; value: number }[];
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  toggling: boolean;
  isEditing: boolean;
  isCrossCurrency: boolean;
  setType: (type: RecurringFormType) => void;
  setAmount: (value: string) => void;
  setAccountId: (id: number) => void;
  setCategoryId: (id: number) => void;
  setDestinationAccountId: (id: number) => void;
  setFrequency: (freq: RecurrenceFrequency) => void;
  setIntervalDays: (value: string) => void;
  setNextExecution: (iso: string | null) => void;
  setActive: (active: boolean) => void;
  setNotes: (value: string) => void;
  setFxRate: (value: string) => void;
  setDestinationAmount: (value: string) => void;
  save: () => Promise<boolean>;
  remove: () => Promise<void>;
  toggleActive: () => Promise<void>;
}

function transferDefaults(
  values: RecurringFormValues,
  accounts: AccountWithBalance[],
  rates: Record<string, number>,
): Pick<RecurringFormValues, 'destinationAmount' | 'fxRate'> {
  const origin = accounts.find((a) => a.id === values.accountId);
  const destination = accounts.find((a) => a.id === values.destinationAccountId);
  if (!origin || !destination) {
    return { destinationAmount: '', fxRate: '' };
  }
  const amount = parseAmount(values.amount);
  if (origin.currency === destination.currency) {
    return { destinationAmount: amount !== null ? String(amount) : '', fxRate: '' };
  }
  const rate = crossRate(origin.currency, destination.currency, rates);
  if (rate === null || amount === null) {
    return { destinationAmount: '', fxRate: '' };
  }
  return { destinationAmount: String(destinationAmountFromRate(amount, rate)), fxRate: String(rate) };
}

export function useRecurringForm(ruleId: number | null): UseRecurringFormResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [values, setValues] = useState<RecurringFormValues>({
    type: 'expense',
    amount: '',
    accountId: null,
    categoryId: 0,
    destinationAccountId: null,
    frequency: null,
    intervalDays: '',
    nextExecution: todayIso(),
    active: true,
    notes: '',
    fxRate: '',
    destinationAmount: '',
  });
  const [errors, setErrors] = useState<RecurringFormErrors>({});
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(ruleId !== null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listAccountsWithBalances(db), getAllCategories(db)]).then(async ([accountRows, categoryRows]) => {
      if (!active) return;
      setAccounts(accountRows);
      setCategories(categoryRows);
      // Rates: try to load if table has data; no-op when empty.
      try {
        const { getLatestRatesToEur } = await import('@/utils/currency');
        const r = await getLatestRatesToEur(db);
        if (active) setRates(r);
      } catch {
        // ignore
      }
    });
    return () => {
      active = false;
    };
  }, [db]);

  useEffect(() => {
    if (ruleId === null) return;
    let active = true;
    getRecurringRuleById(db, ruleId).then((rule) => {
      if (!active || !rule) return;
      // Only expense/income/transfer are editable in MVP
      const type = (rule.type === 'investment' ? 'expense' : rule.type) as RecurringFormType;
      setValues({
        type,
        amount: String(rule.amount),
        accountId: rule.accountId,
        categoryId: rule.categoryId ?? 0,
        destinationAccountId: rule.destinationAccountId,
        frequency: rule.frequency,
        intervalDays: rule.intervalDays !== null ? String(rule.intervalDays) : '',
        nextExecution: rule.nextExecution,
        active: rule.active,
        notes: rule.notes ?? '',
        fxRate: rule.fxRate !== null ? String(rule.fxRate) : '',
        destinationAmount:
          rule.fxRate !== null && rule.destinationAccountId !== null
            ? String(destinationAmountFromRate(rule.amount, rule.fxRate))
            : '',
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [db, ruleId]);

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        label: `${a.name} · ${a.currency}`,
        value: a.id,
      })),
    [accounts],
  );

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.kind === values.type)
        .map((c) => ({ label: c.name, value: c.id, icon: c.icon })),
    [categories, values.type],
  );

  const isCrossCurrency = useMemo(() => {
    if (values.type !== 'transfer') return false;
    const origin = accounts.find((a) => a.id === values.accountId);
    const destination = accounts.find((a) => a.id === values.destinationAccountId);
    return origin !== undefined && destination !== undefined && origin.currency !== destination.currency;
  }, [accounts, values.type, values.accountId, values.destinationAccountId]);

  const validate = useCallback((): RecurringFormErrors => {
    const next: RecurringFormErrors = {};
    const amount = parseAmount(values.amount);
    if (values.amount.trim() === '' || amount === null) {
      next.amount = 'Introduce un importe válido.';
    } else if (amount <= 0) {
      next.amount = 'El importe debe ser mayor que 0.';
    }
    if (values.accountId === null) {
      next.accountId = 'Selecciona una cuenta.';
    }
    if (values.frequency === null) {
      next.frequency = 'Selecciona una frecuencia.';
    }
    if (values.frequency === 'every_n_days') {
      const n = parseInt(values.intervalDays, 10);
      if (!values.intervalDays.trim() || Number.isNaN(n) || n < 1) {
        next.intervalDays = 'Introduce un número de días válido (≥ 1).';
      }
    }
    if (!values.nextExecution) {
      next.nextExecution = 'Selecciona la próxima ejecución.';
    }
    if (values.type === 'transfer') {
      if (values.destinationAccountId === null) {
        next.destinationAccountId = 'Selecciona la cuenta de destino.';
      } else if (values.destinationAccountId === values.accountId) {
        next.destinationAccountId = 'El destino debe ser distinto del origen.';
      }
      if (isCrossCurrency) {
        const rate = parseAmount(values.fxRate);
        if (values.fxRate.trim() === '' || rate === null || rate <= 0) {
          next.fxRate = 'Introduce una tasa de cambio válida.';
        }
        const dest = parseAmount(values.destinationAmount);
        if (values.destinationAmount.trim() === '' || dest === null || dest <= 0) {
          next.destinationAmount = 'Introduce un importe de destino válido.';
        }
      }
    }
    return next;
  }, [values, isCrossCurrency]);

  const save = useCallback(async (): Promise<boolean> => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    if (values.accountId === null || values.frequency === null || !values.nextExecution) return false;

    const account = await getAccountById(db, values.accountId);
    if (!account) return false;

    const amount = parseAmount(values.amount) ?? 0;
    const intervalDays = values.frequency === 'every_n_days' ? parseInt(values.intervalDays, 10) : null;
    let fxRate: number | null = null;
    if (values.type === 'transfer' && isCrossCurrency) {
      fxRate = parseAmount(values.fxRate) ?? null;
    }

    const input: RecurringRuleInput = {
      type: values.type,
      amount,
      currency: account.currency,
      accountId: values.accountId,
      destinationAccountId: values.type === 'transfer' ? values.destinationAccountId : null,
      categoryId: values.type === 'transfer' ? null : values.categoryId === 0 ? null : values.categoryId,
      instrumentId: null,
      notes: values.notes.trim() || null,
      frequency: values.frequency,
      intervalDays,
      nextExecution: values.nextExecution,
      active: values.active,
      fxRate,
    };

    setSaving(true);
    try {
      if (ruleId === null) {
        await insertRecurringRule(db, input);
      } else {
        await updateRecurringRule(db, ruleId, input);
      }
      return true;
    } finally {
      setSaving(false);
    }
  }, [db, ruleId, values, validate, isCrossCurrency]);

  const remove = useCallback(async (): Promise<void> => {
    if (ruleId === null) return;
    setDeleting(true);
    try {
      await deleteRecurringRule(db, ruleId);
    } finally {
      setDeleting(false);
    }
  }, [db, ruleId]);

  const toggleActive = useCallback(async (): Promise<void> => {
    if (ruleId === null) return;
    setToggling(true);
    try {
      const next = !values.active;
      await setRecurringRuleActive(db, ruleId, next);
      setValues((v) => ({ ...v, active: next }));
    } finally {
      setToggling(false);
    }
  }, [db, ruleId, values.active]);

  const setType = useCallback(
    (type: RecurringFormType) => {
      setValues((current) => {
        const next = { ...current, type, categoryId: 0 };
        if (type === 'transfer') {
          return { ...next, ...transferDefaults(next, accounts, rates) };
        }
        return next;
      });
    },
    [accounts, rates],
  );

  const setAmount = useCallback(
    (amount: string) => {
      setValues((current) => {
        const next = { ...current, amount };
        if (next.type === 'transfer') {
          const origin = accounts.find((a) => a.id === next.accountId);
          const destination = accounts.find((a) => a.id === next.destinationAccountId);
          if (origin && destination && origin.currency === destination.currency) {
            const parsed = parseAmount(amount);
            next.destinationAmount = parsed !== null ? String(parsed) : '';
            next.fxRate = '';
          } else if (origin && destination) {
            const parsed = parseAmount(amount);
            const rate = parseAmount(next.fxRate);
            if (parsed !== null && rate !== null && rate > 0) {
              next.destinationAmount = String(destinationAmountFromRate(parsed, rate));
            } else if (parsed !== null) {
              const prefilled = crossRate(origin.currency, destination.currency, rates);
              if (prefilled !== null) {
                next.fxRate = String(prefilled);
                next.destinationAmount = String(destinationAmountFromRate(parsed, prefilled));
              }
            }
          }
        }
        return next;
      });
    },
    [accounts, rates],
  );

  const setAccountId = useCallback(
    (accountId: number) => {
      setValues((current) => {
        const next = { ...current, accountId };
        if (next.type === 'transfer') {
          return { ...next, ...transferDefaults(next, accounts, rates) };
        }
        return next;
      });
    },
    [accounts, rates],
  );

  const setCategoryId = useCallback((categoryId: number) => setValues((v) => ({ ...v, categoryId })), []);
  const setNotes = useCallback((notes: string) => setValues((v) => ({ ...v, notes })), []);
  const setFrequency = useCallback((frequency: RecurrenceFrequency) => setValues((v) => ({ ...v, frequency })), []);
  const setIntervalDays = useCallback((intervalDays: string) => setValues((v) => ({ ...v, intervalDays })), []);
  const setNextExecution = useCallback((nextExecution: string | null) => setValues((v) => ({ ...v, nextExecution })), []);
  const setActive = useCallback((active: boolean) => setValues((v) => ({ ...v, active })), []);
  const setDestinationAccountId = useCallback(
    (destinationAccountId: number) => {
      setValues((current) => {
        const next = { ...current, destinationAccountId };
        if (next.type === 'transfer') {
          return { ...next, ...transferDefaults(next, accounts, rates) };
        }
        return next;
      });
    },
    [accounts, rates],
  );

  const setFxRate = useCallback((fxRate: string) => {
    setValues((current) => {
      const next = { ...current, fxRate };
      if (next.type === 'transfer') {
        const amount = parseAmount(next.amount);
        const rate = parseAmount(fxRate);
        if (amount !== null && amount > 0 && rate !== null && rate > 0) {
          next.destinationAmount = String(destinationAmountFromRate(amount, rate));
        }
      }
      return next;
    });
  }, []);

  const setDestinationAmount = useCallback((destinationAmount: string) => {
    setValues((current) => {
      const next = { ...current, destinationAmount };
      if (next.type === 'transfer') {
        const amount = parseAmount(next.amount);
        const dest = parseAmount(destinationAmount);
        if (amount !== null && amount > 0 && dest !== null && dest > 0) {
          next.fxRate = String(rateFromAmounts(amount, dest));
        }
      }
      return next;
    });
  }, []);

  return {
    values,
    errors,
    accounts,
    accountOptions,
    categoryOptions,
    loading,
    saving,
    deleting,
    toggling,
    isEditing: ruleId !== null,
    isCrossCurrency,
    setType,
    setAmount,
    setAccountId,
    setCategoryId,
    setDestinationAccountId,
    setFrequency,
    setIntervalDays,
    setNextExecution,
    setActive,
    setNotes,
    setFxRate,
    setDestinationAmount,
    save,
    remove,
    toggleActive,
  };
}
