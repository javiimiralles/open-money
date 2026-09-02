import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { TransactionRow } from '@/components/TransactionRow';
import { useTransactions } from '@/hooks/use-transactions';
import { colors, spacing, typography } from '@/theme/tokens';

export default function TransactionsScreen() {
  const router = useRouter();
  const { items, loading } = useTransactions();

  const openTransaction = (id: number) => {
    router.push({ pathname: '/transaction-form', params: { id: String(id) } });
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TransactionRow transaction={item} onPress={() => openTransaction(item.id)} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={styles.title}>Movimientos</Text>}
        ListEmptyComponent={
          loading ? null : (
            <Card variant="sage">
              <Text style={styles.emptyText}>
                Todavía no hay movimientos. Usa el botón «+» para registrar el primero.
              </Text>
            </Card>
          )
        }
      />
    </View>
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
  title: {
    ...typography.displayXs,
    color: colors.ink,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.body,
  },
});