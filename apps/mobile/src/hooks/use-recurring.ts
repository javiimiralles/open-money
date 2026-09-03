/**
 * Loads recurring rules for the list screen.
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { listRecurringRules, type RecurringRuleWithDetails } from '@/db/repositories/recurring-rules-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';

export interface UseRecurringResult {
  items: RecurringRuleWithDetails[];
  loading: boolean;
  reload: () => Promise<void>;
}

export function useRecurring(): UseRecurringResult {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const [items, setItems] = useState<RecurringRuleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await listRecurringRules(db);
    setItems(rows);
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

  return { items, loading, reload: load };
}
