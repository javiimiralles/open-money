import { Stack, useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useCallback, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { RecurringRuleRow } from '@/components/RecurringRuleRow';
import { setRecurringRuleActive } from '@/db/repositories/recurring-rules-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { useRecurring } from '@/hooks/use-recurring';
import { colors, spacing, typography } from '@/theme/tokens';

export default function RecurringScreen() {
  const router = useRouter();
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const { items, loading, reload } = useRecurring();

  const openNew = useCallback(() => {
    router.push('/recurring-form');
  }, [router]);

  const openRule = useCallback(
    (id: number) => {
      router.push({ pathname: '/recurring-form', params: { id: String(id) } });
    },
    [router],
  );

  const handleToggle = useCallback(
    async (id: number, active: boolean) => {
      await setRecurringRuleActive(db, id, !active);
      await reload();
    },
    [db, reload],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Pagos recurrentes' }} />
      <View style={styles.screen}>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.description}>
                Crea ingresos, gastos o transferencias periódicas. Se aplicarán automáticamente al abrir la app.
              </Text>
              <Button label="Nueva regla" onPress={openNew} />
            </View>
          }
          renderItem={({ item }) => (
            <RecurringRuleRow
              rule={item}
              onPress={() => openRule(item.id)}
              onToggleActive={() => handleToggle(item.id, item.active)}
            />
          )}
          ListEmptyComponent={
            loading ? null : (
              <Card variant="sage">
                <Text style={styles.emptyText}>Todavía no tienes reglas recurrentes.</Text>
              </Card>
            )
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvasSoft,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.lg,
  },
  description: {
    ...typography.bodyMd,
    color: colors.body,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.body,
  },
});
