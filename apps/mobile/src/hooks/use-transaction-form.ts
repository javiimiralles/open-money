/**
 * Transaction create/edit form state, validation, save, and delete flow.
 * The transaction currency is derived from the selected account.
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
import { todayIso } from '@/utils/dates';
import { formatMoney, parseAmount } from '@/utils/money';

export type TransactionFormType = 'income' | 'expense';

export interface TransactionFormValues {
  type: TransactionFormType;
  date: string;
  amount: string;
  accountId: number | null;
  /** 0 means "no category"; real category ids start at 1. */
  categoryId: number;
  notes: string;
}

export interface TransactionFormErrors {
  amount?: string;
  accountId?: string;
}

export interface UseTransactionFormResult {
  values: TransactionFormValues;
  errors: TransactionFormErrors;
  accounts: AccountWithBalance[];
  accountOptions: { label: string; value: number }[];
  categoryOptions: { label: string; value: number }[];
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  isEditing: boolean;
  setType: (type: TransactionFormType) => void;
  setDate: (date: string) => void;
  setAmount: (amount: string) => void;
  setAccountId: (accountId: number) => void;
  setCategoryId: (categoryId: number) => void;
  setNotes: (notes: string) => void;
  save: () => Promise<boolean>;
  remove: () => Promise<void>;
}

export function useTransactionForm(transactionId: number | null): UseTransactionFormResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [values, setValues] = useState<TransactionFormValues>({
    type: 'expense',
    date: todayIso(),
    amount: '',
    accountId: null,
    categoryId: 0,
    notes: '',
  });
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(transactionId !== null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listAccountsWithBalances(db), getAllCategories(db)]).then(([accountRows, categoryRows]) => {
      if (!active) {
        return;
      }
      setAccounts(accountRows);
      setCategories(categoryRows);
    });
    return () => {
      active = false;
    };
  }, [db]);

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
        type: transaction.type === 'income' ? 'income' : 'expense',
        date: transaction.date,
        amount: String(transaction.amount),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId ?? 0,
        notes: transaction.notes ?? '',
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [db, transactionId]);

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        label: `${account.name} · ${formatMoney(account.balance, account.currency)}`,
        value: account.id,
      })),
    [accounts],
  );

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.kind === values.type)
        .map((category) => ({ label: category.name, value: category.id })),
    [categories, values.type],
  );

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
    return nextErrors;
  }, [values]);

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

    const input: TransactionInput = {
      type: values.type,
      date: values.date,
      amount: parseAmount(values.amount) ?? 0,
      currency: account.currency,
      accountId: values.accountId,
      categoryId: values.categoryId === 0 ? null : values.categoryId,
      notes: values.notes.trim() || null,
    };

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
  }, [db, transactionId, values, validate]);

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

  return {
    values,
    errors,
    accounts,
    accountOptions,
    categoryOptions,
    loading,
    saving,
    deleting,
    isEditing: transactionId !== null,
    setType: (type: TransactionFormType) => setValues((v) => ({ ...v, type, categoryId: 0 })),
    setDate: (date: string) => setValues((v) => ({ ...v, date })),
    setAmount: (amount: string) => setValues((v) => ({ ...v, amount })),
    setAccountId: (accountId: number) => setValues((v) => ({ ...v, accountId })),
    setCategoryId: (categoryId: number) => setValues((v) => ({ ...v, categoryId })),
    setNotes: (notes: string) => setValues((v) => ({ ...v, notes })),
    save,
    remove,
  };
}