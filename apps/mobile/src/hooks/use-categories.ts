/**
 * Loads categories grouped by kind for the management screen.
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { getAllCategories, type Category } from '@/db/repositories/categories-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';

export interface CategorySection {
  title: string;
  data: Category[];
}

export interface UseCategoriesResult {
  sections: CategorySection[];
  loading: boolean;
}

export function useCategories(): UseCategoriesResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const categories = await getAllCategories(db);
    setItems(categories);
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

  const sections = useMemo<CategorySection[]>(
    () => [
      { title: 'Gastos', data: items.filter((item) => item.kind === 'expense') },
      { title: 'Ingresos', data: items.filter((item) => item.kind === 'income') },
    ],
    [items],
  );

  return { sections, loading };
}
