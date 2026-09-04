import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountCardScroller } from '@/components/AccountCardScroller';
import { Card } from '@/components/Card';
import { QuickActions } from '@/components/QuickActions';
import { TransactionRow } from '@/components/TransactionRow';
import { useDashboard } from '@/hooks/use-dashboard';
import type { TransactionFormType } from '@/hooks/use-transaction-form';
import { spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { getGreeting } from '@/utils/greeting';
import { formatMoney, MONEY_MASK } from '@/utils/money';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accounts, netWorthEur, unpricedCount, hasMissingRates, recentTransactions, loading } = useDashboard();
  const greeting = useMemo(() => getGreeting(new Date().getHours()), []);
  const [balancesHidden, setBalancesHidden] = useState(false);

  const openAccount = (id: number) => {
    router.push({ pathname: '/account-form', params: { id: String(id) } });
  };

  const openTransaction = (id: number) => {
    router.push({ pathname: '/transaction-form', params: { id: String(id) } });
  };

  const openNewTransaction = (type: TransactionFormType) => {
    router.push({ pathname: '/transaction-form', params: { type } });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TransactionRow transaction={item} onPress={() => openTransaction(item.id)} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={balancesHidden ? 'Mostrar importes' : 'Ocultar importes'}
                hitSlop={spacing.sm}
                onPress={() => setBalancesHidden((previous) => !previous)}
                style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}>
                <MaterialCommunityIcons
                  name={balancesHidden ? 'eye-off' : 'eye'}
                  size={22}
                  color={colors.body}
                />
              </Pressable>
            </View>
            <Card>
              <View style={styles.netWorth}>
                <Text style={styles.netWorthLabel}>Patrimonio neto</Text>
                <Text style={styles.netWorthValue} numberOfLines={1} adjustsFontSizeToFit>
                  {balancesHidden ? MONEY_MASK : formatMoney(netWorthEur, 'EUR')}
                </Text>
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
                <QuickActions onSelect={openNewTransaction} />
              </View>
            </Card>
            <Text style={styles.sectionTitle}>Cuentas</Text>
            {accounts.length > 0 ? (
              <AccountCardScroller accounts={accounts} onPress={openAccount} hidden={balancesHidden} />
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
                Todavía no hay movimientos. Usa los accesos rápidos para registrar el primero.
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
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    greeting: {
      ...typography.displayXs,
      color: colors.ink,
      flexShrink: 1,
    },
    eyeButton: {
      padding: spacing.xs,
    },
    eyeButtonPressed: {
      opacity: 0.6,
    },
    netWorth: {
      alignItems: 'center',
      gap: spacing.md,
    },
    netWorthLabel: {
      ...typography.bodySm,
      color: colors.body,
    },
    netWorthValue: {
      ...typography.displayMd,
      color: colors.ink,
    },
    netWorthNote: {
      ...typography.caption,
      color: colors.warningDeep,
    },
    sectionTitle: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
    emptyText: {
      ...typography.bodyMd,
      color: colors.body,
    },
  });
