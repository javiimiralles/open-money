import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountCardScroller } from '@/components/AccountCardScroller';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAccounts } from '@/hooks/use-accounts';
import { spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatMoney } from '@/utils/money';

export default function AccountsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, loading, totalEur, hasMissingRates } = useAccounts();

  const openNewAccount = () => {
    router.push('/account-form');
  };

  const openAccount = (id: number) => {
    router.push({ pathname: '/account-form', params: { id: String(id) } });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {items.length > 0 ? (
          <Card variant="sage">
            <Text style={styles.totalLabel}>Patrimonio total</Text>
            <Text style={styles.totalValue}>{formatMoney(totalEur, 'EUR')}</Text>
            {hasMissingRates ? (
              <Text style={styles.missingRateNote}>
                Alguna divisa no tiene tasa de cambio guardada; se muestra con tasa 1:1.
              </Text>
            ) : null}
          </Card>
        ) : null}
        <Text style={styles.title}>Cuentas</Text>
        {items.length > 0 ? (
          <AccountCardScroller accounts={items} onPress={openAccount} />
        ) : loading ? null : (
          <Card variant="sage">
            <Text style={styles.emptyText}>
              Todavía no tienes cuentas. Crea la primera para empezar a organizar tu dinero.
            </Text>
          </Card>
        )}
        <Button label="Nueva cuenta" onPress={openNewAccount} />
      </ScrollView>
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
    title: {
      ...typography.displayXs,
      color: colors.ink,
    },
    totalLabel: {
      ...typography.bodySm,
      color: colors.body,
    },
    totalValue: {
      ...typography.displayXs,
      color: colors.ink,
    },
    missingRateNote: {
      ...typography.caption,
      color: colors.warningDeep,
    },
    emptyText: {
      ...typography.bodyMd,
      color: colors.body,
    },
  });
