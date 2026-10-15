/**
 * Transaction create/edit form state, validation, save, and delete flow.
 * The transaction currency is derived from the selected account.
 * Transfers (US-005) add a destination account and optional FX fields.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAccountById, listAccountsWithBalances, type AccountWithBalance } from '@/db/repositories/accounts-repo';
import { getAllCategories, type Category } from '@/db/repositories/categories-repo';
import {
  deleteTransaction,
  getTransactionById,
  insertTransaction,
  updateTransaction,
  type TransactionInput,
} from '@/db/repositories/transactions-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import type { AccountListItem } from '@/hooks/use-accounts';
import { getLatestRatesToEur, toAccountListItems } from '@/utils/currency';
import { todayIso } from '@/utils/dates';
import { parseAmount } from '@/utils/money';
import {
  applyTransferAmount,
  applyTransferDestinationAmount,
  applyTransferFxRate,
  transferDefaults,
} from '@/utils/transfer';

export type TransactionFormType = 'income' | 'expense' | 'transfer' | 'investment';

export interface TransactionFormValues {
  type: TransactionFormType;
  date: string;
  amount: string;
  accountId: number | null;
  /** 0 means "no category"; real category ids start at 1. */
  categoryId: number;
  notes: string;
  destinationAccountId: number | null;
  destinationAmount: string;
  fxRate: string;
}

export interface TransactionFormErrors {
  amount?: string;
  accountId?: string;
  destinationAccountId?: string;
  destinationAmount?: string;
  fxRate?: string;
}

export interface UseTransactionFormResult {
  values: TransactionFormValues;
  errors: TransactionFormErrors;
  accounts: AccountWithBalance[];
  accountCards: AccountListItem[];
  categoryOptions: { label: string; value: number }[];
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  isEditing: boolean;
  isCrossCurrency: boolean;
  setType: (type: TransactionFormType) => void;
  setDate: (date: string) => void;
  setAmount: (amount: string) => void;
  setAccountId: (accountId: number) => void;
  setCategoryId: (categoryId: number) => void;
  setNotes: (notes: string) => void;
  setDestinationAccountId: (destinationAccountId: number) => void;
  setDestinationAmount: (destinationAmount: string) => void;
  setFxRate: (fxRate: string) => void;
  save: () => Promise<boolean>;
  remove: () => Promise<void>;
}

export function useTransactionForm(
  transactionId: number | null,
  initialType: TransactionFormType = 'expense',
): UseTransactionFormResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [values, setValues] = useState<TransactionFormValues>({
    type: transactionId === null ? initialType : 'expense',
    date: todayIso(),
    amount: '',
    accountId: null,
    categoryId: 0,
    notes: '',
    destinationAccountId: null,
    destinationAmount: '',
    fxRate: '',
  });
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(transactionId !== null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listAccountsWithBalances(db), getAllCategories(db), getLatestRatesToEur(db)]).then(
      ([accountRows, categoryRows, rateRows]) => {
        if (!active) {
          return;
        }
        setAccounts(accountRows);
        setCategories(categoryRows);
        setRates(rateRows);
        if (transactionId === null) {
          const primary = accountRows.find((account) => account.isPrimary);
          if (primary) {
            setValues((current) => ({ ...current, accountId: primary.id }));
          }
        }
      },
    );
    return () => {
      active = false;
    };
  }, [db, transactionId]);

  useEffect(() => {
    if (transactionId === null) {
      return;
    }
    let active = true;
    getTransactionById(db, transactionId).then((transaction) => {
      if (!active || !transaction) {
        return;
      }
      setValues({
        type: transaction.type,
        date: transaction.date,
        amount: String(transaction.amount),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId ?? 0,
        notes: transaction.notes ?? '',
        destinationAccountId: transaction.destinationAccountId,
        destinationAmount: transaction.destinationAmount !== null ? String(transaction.destinationAmount) : '',
        fxRate: transaction.fxRate !== null ? String(transaction.fxRate) : '',
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [db, transactionId]);

  const accountCards = useMemo(() => toAccountListItems(accounts, rates), [accounts, rates]);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.kind === values.type)
        .map((category) => ({ label: category.name, value: category.id, icon: category.icon })),
    [categories, values.type],
  );

  const isCrossCurrency = useMemo(() => {
    if (values.type !== 'transfer') {
      return false;
    }
    const origin = accounts.find((account) => account.id === values.accountId);
    const destination = accounts.find((account) => account.id === values.destinationAccountId);
    return origin !== undefined && destination !== undefined && origin.currency !== destination.currency;
  }, [accounts, values.type, values.accountId, values.destinationAccountId]);

  const validate = useCallback((): TransactionFormErrors => {
    const nextErrors: TransactionFormErrors = {};
    const amount = parseAmount(values.amount);
    if (values.amount.trim() === '' || amount === null) {
      nextErrors.amount = 'Introduce un importe válido.';
    } else if (amount <= 0) {
      nextErrors.amount = 'El importe debe ser mayor que 0.';
    }
    if (values.accountId === null) {
      nextErrors.accountId = 'Selecciona una cuenta.';
    }
    if (values.type === 'transfer') {
      if (values.destinationAccountId === null) {
        nextErrors.destinationAccountId = 'Selecciona la cuenta de destino.';
      } else if (values.destinationAccountId === values.accountId) {
        nextErrors.destinationAccountId = 'El destino debe ser distinto del origen.';
      }
      if (isCrossCurrency) {
        const rate = parseAmount(values.fxRate);
        if (values.fxRate.trim() === '' || rate === null || rate <= 0) {
          nextErrors.fxRate = 'Introduce una tasa de cambio válida.';
        }
        const destinationAmount = parseAmount(values.destinationAmount);
        if (values.destinationAmount.trim() === '' || destinationAmount === null || destinationAmount <= 0) {
          nextErrors.destinationAmount = 'Introduce un importe de destino válido.';
        }
      }
    }
    return nextErrors;
  }, [values, isCrossCurrency]);

  const save = useCallback(async (): Promise<boolean> => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return false;
    }
    if (values.accountId === null) {
      return false;
    }

    const account = await getAccountById(db, values.accountId);
    if (!account) {
      return false;
    }

    const amount = parseAmount(values.amount) ?? 0;
    const base = {
      date: values.date,
      amount,
      currency: account.currency,
      accountId: values.accountId,
      notes: values.notes.trim() || null,
    };

    let input: TransactionInput;
    if (values.type === 'transfer') {
      if (values.destinationAccountId === null) {
        return false;
      }
      const destinationAmount = isCrossCurrency ? parseAmount(values.destinationAmount) ?? 0 : amount;
      // Persist the exact ratio (T-2) so the three fields stay consistent.
      const fxRate = isCrossCurrency && amount > 0 ? destinationAmount / amount : null;
      input = {
        type: 'transfer',
        ...base,
        destinationAccountId: values.destinationAccountId,
        destinationAmount,
        fxRate,
      };
    } else {
      input = {
        type: values.type,
        ...base,
        categoryId: values.categoryId === 0 ? null : values.categoryId,
      };
    }

    setSaving(true);
    try {
      if (transactionId === null) {
        await insertTransaction(db, input);
      } else {
        await updateTransaction(db, transactionId, input);
      }
      return true;
    } finally {
      setSaving(false);
    }
  }, [db, transactionId, values, validate, isCrossCurrency]);

  const remove = useCallback(async (): Promise<void> => {
    if (transactionId === null) {
      return;
    }
    setDeleting(true);
    try {
      await deleteTransaction(db, transactionId);
    } finally {
      setDeleting(false);
    }
  }, [db, transactionId]);

  const setType = useCallback(
    (type: TransactionFormType) => {
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

  const setDate = useCallback((date: string) => setValues((v) => ({ ...v, date })), []);
  const setAmount = useCallback(
    (amount: string) => {
      setValues((current) =>
        current.type === 'transfer'
          ? applyTransferAmount(current, amount, accounts, rates)
          : { ...current, amount },
      );
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
  const setDestinationAmount = useCallback((destinationAmount: string) => {
    setValues((current) =>
      current.type === 'transfer'
        ? applyTransferDestinationAmount(current, destinationAmount)
        : { ...current, destinationAmount },
    );
  }, []);
  const setFxRate = useCallback((fxRate: string) => {
    setValues((current) =>
      current.type === 'transfer' ? applyTransferFxRate(current, fxRate) : { ...current, fxRate },
    );
  }, []);

  return {
    values,
    errors,
    accounts,
    accountCards,
    categoryOptions,
    loading,
    saving,
    deleting,
    isEditing: transactionId !== null,
    isCrossCurrency,
    setType,
    setDate,
    setAmount,
    setAccountId,
    setCategoryId,
    setNotes,
    setDestinationAccountId,
    setDestinationAmount,
    setFxRate,
    save,
    remove,
  };
}