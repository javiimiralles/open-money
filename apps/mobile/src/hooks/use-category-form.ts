/**
 * Category create/edit form state, validation, save, and delete flow.
 * Deleting a category moves its transactions to "uncategorized" (NULL);
 * deletion is blocked while active recurring rules use the category.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  categoryNameExists,
  countActiveRecurringRulesForCategory,
  countTransactionsForCategory,
  deleteCategory,
  getCategoryById,
  insertCategory,
  updateCategory,
  type CategoryKind,
} from '@/db/repositories/categories-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';

export interface CategoryFormValues {
  name: string;
  kind: CategoryKind;
}

export interface CategoryFormErrors {
  name?: string;
}

export type CategoryDeleteRequestResult =
  | { status: 'blocked'; recurringRules: number }
  | { status: 'confirm'; transactions: number };

export interface UseCategoryFormResult {
  values: CategoryFormValues;
  errors: CategoryFormErrors;
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  isEditing: boolean;
  setName: (value: string) => void;
  setKind: (value: CategoryKind) => void;
  save: () => Promise<boolean>;
  requestDelete: () => Promise<CategoryDeleteRequestResult>;
  performDelete: () => Promise<void>;
}

export function useCategoryForm(categoryId: number | null): UseCategoryFormResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [values, setValues] = useState<CategoryFormValues>({ name: '', kind: 'expense' });
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [loading, setLoading] = useState(categoryId !== null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (categoryId === null) {
      return;
    }
    let active = true;
    getCategoryById(db, categoryId).then((category) => {
      if (!active || !category) {
        return;
      }
      setValues({ name: category.name, kind: category.kind });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [db, categoryId]);

  const save = useCallback(async (): Promise<boolean> => {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      setErrors({ name: 'El nombre es obligatorio.' });
      return false;
    }
    if (await categoryNameExists(db, trimmedName, values.kind, categoryId ?? undefined)) {
      setErrors({ name: 'Ya existe una categoría con ese nombre para este tipo.' });
      return false;
    }
    setErrors({});

    const input = { name: trimmedName, kind: values.kind };

    setSaving(true);
    try {
      if (categoryId === null) {
        await insertCategory(db, input);
      } else {
        await updateCategory(db, categoryId, input);
      }
      return true;
    } finally {
      setSaving(false);
    }
  }, [db, categoryId, values]);

  const requestDelete = useCallback(async (): Promise<CategoryDeleteRequestResult> => {
    if (categoryId === null) {
      return { status: 'confirm', transactions: 0 };
    }
    const [recurringRules, transactions] = await Promise.all([
      countActiveRecurringRulesForCategory(db, categoryId),
      countTransactionsForCategory(db, categoryId),
    ]);
    if (recurringRules > 0) {
      return { status: 'blocked', recurringRules };
    }
    return { status: 'confirm', transactions };
  }, [db, categoryId]);

  const performDelete = useCallback(async (): Promise<void> => {
    if (categoryId === null) {
      return;
    }
    setDeleting(true);
    try {
      await deleteCategory(db, categoryId);
    } finally {
      setDeleting(false);
    }
  }, [db, categoryId]);

  return {
    values,
    errors,
    loading,
    saving,
    deleting,
    isEditing: categoryId !== null,
    setName: (name: string) => setValues((v) => ({ ...v, name })),
    setKind: (kind: CategoryKind) => setValues((v) => ({ ...v, kind })),
    save,
    requestDelete,
    performDelete,
  };
}
