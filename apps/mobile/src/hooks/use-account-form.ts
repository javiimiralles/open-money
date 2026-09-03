/**
 * Account create/edit form state, validation, save, and delete flow.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  countActiveRecurringRulesForAccount,
  countTransactionsForAccount,
  deleteAccount,
  getAccountById,
  insertAccount,
  updateAccount,
} from '@/db/repositories/accounts-repo';
import { countTradesForAccount } from '@/db/repositories/trades-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { parseAmount } from '@/utils/money';

export interface AccountFormValues {
  name: string;
  identifier: string;
  currency: string;
  initialBalance: string;
  color: string | null;
  isPrimary: boolean;
}

export interface AccountFormErrors {
  name?: string;
  initialBalance?: string;
}

export type DeleteRequestResult =
  | { status: 'blocked'; recurringRules: number }
  | { status: 'confirm'; transactions: number; trades: number };

export interface UseAccountFormResult {
  values: AccountFormValues;
  errors: AccountFormErrors;
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  isEditing: boolean;
  setName: (value: string) => void;
  setIdentifier: (value: string) => void;
  setCurrency: (value: string) => void;
  setInitialBalance: (value: string) => void;
  setColor: (value: string | null) => void;
  setIsPrimary: (value: boolean) => void;
  save: () => Promise<boolean>;
  requestDelete: () => Promise<DeleteRequestResult>;
  performDelete: () => Promise<void>;
}

export function useAccountForm(accountId: number | null): UseAccountFormResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [values, setValues] = useState<AccountFormValues>({
    name: '',
    identifier: '',
    currency: 'EUR',
    initialBalance: '',
    color: null,
    isPrimary: false,
  });
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [loading, setLoading] = useState(accountId !== null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (accountId === null) {
      return;
    }
    let active = true;
    getAccountById(db, accountId).then((account) => {
      if (!active || !account) {
        return;
      }
      setValues({
        name: account.name,
        identifier: account.identifier ?? '',
        currency: account.currency,
        initialBalance: String(account.initialBalance),
        color: account.color,
        isPrimary: account.isPrimary,
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [db, accountId]);

  const validate = useCallback((): AccountFormErrors => {
    const nextErrors: AccountFormErrors = {};
    if (!values.name.trim()) {
      nextErrors.name = 'El nombre es obligatorio.';
    }
    const amount = parseAmount(values.initialBalance);
    if (values.initialBalance.trim() !== '' && amount === null) {
      nextErrors.initialBalance = 'Introduce un importe válido.';
    } else if (amount !== null && amount < 0) {
      nextErrors.initialBalance = 'El importe inicial no puede ser negativo.';
    }
    return nextErrors;
  }, [values]);

  const save = useCallback(async (): Promise<boolean> => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return false;
    }

    const input = {
      name: values.name.trim(),
      identifier: values.identifier.trim() || null,
      currency: values.currency,
      initialBalance: parseAmount(values.initialBalance) ?? 0,
      color: values.color,
      isPrimary: values.isPrimary,
    };

    setSaving(true);
    try {
      if (accountId === null) {
        await insertAccount(db, input);
      } else {
        await updateAccount(db, accountId, input);
      }
      return true;
    } finally {
      setSaving(false);
    }
  }, [db, accountId, values, validate]);

  const requestDelete = useCallback(async (): Promise<DeleteRequestResult> => {
    if (accountId === null) {
      return { status: 'confirm', transactions: 0, trades: 0 };
    }
    const [recurringRules, transactions, trades] = await Promise.all([
      countActiveRecurringRulesForAccount(db, accountId),
      countTransactionsForAccount(db, accountId),
      countTradesForAccount(db, accountId),
    ]);
    if (recurringRules > 0) {
      return { status: 'blocked', recurringRules };
    }
    return { status: 'confirm', transactions, trades };
  }, [db, accountId]);

  const performDelete = useCallback(async (): Promise<void> => {
    if (accountId === null) {
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(db, accountId);
    } finally {
      setDeleting(false);
    }
  }, [db, accountId]);

  return {
    values,
    errors,
    loading,
    saving,
    deleting,
    isEditing: accountId !== null,
    setName: (name: string) => setValues((v) => ({ ...v, name })),
    setIdentifier: (identifier: string) => setValues((v) => ({ ...v, identifier })),
    setCurrency: (currency: string) => setValues((v) => ({ ...v, currency })),
    setInitialBalance: (initialBalance: string) => setValues((v) => ({ ...v, initialBalance })),
    setColor: (color: string | null) => setValues((v) => ({ ...v, color })),
    setIsPrimary: (isPrimary: boolean) => setValues((v) => ({ ...v, isPrimary })),
    save,
    requestDelete,
    performDelete,
  };
}