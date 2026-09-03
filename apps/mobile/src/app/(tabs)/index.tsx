import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { AccountRow } from '@/components/AccountRow';
import { Card } from '@/components/Card';
import { TransactionRow } from '@/components/TransactionRow';
import { useDashboard } from '@/hooks/use-dashboard';
import { spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatMoney } from '@/utils/money';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { accounts, netWorthEur, unpricedCount, hasMissingRates, recentTransactions, loading } = useDashboard();

  const openAccount = (id: number) => {
    router.push({ pathname: '/account-form', params: { id: String(id) } });
  };

  const openTransaction = (id: number) => {
    router.push({ pathname: '/transaction-form', params: { id: String(id) } });
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TransactionRow transaction={item} onPress={() => openTransaction(item.id)} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Panel</Text>
            <Card variant="dark">
              <View style={styles.netWorth}>
                <Text style={styles.netWorthLabel}>Patrimonio neto</Text>
                <Text style={styles.netWorthValue}>{formatMoney(netWorthEur, 'EUR')}</Text>
                {unpricedCount > 0 ? (
                  <Text style={styles.netWorthNote}>
                    {unpricedCount === 1
                      ? '1 posición sin precio no incluida en el total.'
                      : `${unpricedCount} posiciones sin precio no incluidas en el total.`}
                  </Text>
                ) : null}
                {hasMissingRates ? (
                  <Text style={styles.netWorthNote}>
                    Alguna divisa no tiene tasa de cambio guardada; se muestra con tasa 1:1.
                  </Text>
                ) : null}
              </View>
            </Card>
            <Text style={styles.sectionTitle}>Cuentas</Text>
            {accounts.length > 0 ? (
              <View style={styles.accountsList}>
                {accounts.map((account) => (
                  <AccountRow key={account.id} account={account} onPress={() => openAccount(account.id)} />
                ))}
              </View>
            ) : loading ? null : (
              <Card variant="sage">
                <Text style={styles.emptyText}>
                  Todavía no tienes cuentas. Crea la primera para empezar a organizar tu dinero.
                </Text>
              </Card>
            )}
            <Text style={styles.sectionTitle}>Últimos movimientos</Text>
          </View>
        }
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    title: {
      ...typography.displayXs,
      color: colors.ink,
    },
    netWorth: {
      gap: spacing.xs,
    },
    netWorthLabel: {
      ...typography.bodySm,
      color: colors.canvasSoft,
    },
    netWorthValue: {
      ...typography.displayXs,
      color: colors.primary,
    },
    netWorthNote: {
      ...typography.caption,
      color: colors.warning,
    },
    sectionTitle: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
    accountsList: {
      gap: spacing.lg,
    },
    emptyText: {
      ...typography.bodyMd,
      color: colors.body,
    },
  });
