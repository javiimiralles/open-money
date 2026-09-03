import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PortfolioRow } from '@/components/PortfolioRow';
import { usePortfolio } from '@/hooks/use-portfolio';
import { spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatDateEs } from '@/utils/dates';
import { formatMoney, formatPercent } from '@/utils/money';

export default function PortfolioScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { items, loading, totals, lastUpdateAt, refreshing, refreshError, refreshPrices } = usePortfolio();

  const openNewInstrument = () => {
    router.push('/instrument-search');
  };

  const openInstrument = (id: number) => {
    router.push({ pathname: '/instrument-detail', params: { id: String(id) } });
  };

  const totalPnlColor =
    totals.totalPnlEur === null
      ? colors.mute
      : totals.totalPnlEur >= 0
        ? colors.positiveDeep
        : colors.negativeDarkest;

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <PortfolioRow item={item} onPress={() => openInstrument(item.id)} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Cartera</Text>
            {items.length > 0 ? (
              <Card>
                <View style={styles.totals}>
                  <Text style={styles.totalLabel}>Valor total</Text>
                  <Text style={styles.totalValue}>
                    {totals.valuedCount > 0 ? formatMoney(totals.totalValueEur, 'EUR') : '—'}
                  </Text>
                  <Text style={[styles.totalPnl, { color: totalPnlColor }]}>
                    {totals.totalPnlEur !== null && totals.totalPnlPct !== null
                      ? `${totals.totalPnlEur >= 0 ? '+' : ''}${formatMoney(totals.totalPnlEur, 'EUR')} (${formatPercent(totals.totalPnlPct)})`
                      : 'P&L no disponible'}
                  </Text>
                  <Text style={styles.meta}>
                    {lastUpdateAt
                      ? `Última actualización: ${formatDateEs(lastUpdateAt)}`
                      : 'Sin precios conocidos todavía'}
                  </Text>
                  {totals.unpricedCount > 0 ? (
                    <Text style={styles.note}>
                      {totals.unpricedCount === 1
                        ? '1 posición sin precio no incluida en el total.'
                        : `${totals.unpricedCount} posiciones sin precio no incluidas en el total.`}
                    </Text>
                  ) : null}
                  {totals.rateMissing ? (
                    <Text style={styles.note}>
                      Alguna divisa no tiene tasa de cambio guardada; se muestra con tasa 1:1.
                    </Text>
                  ) : null}
                  {refreshError ? <Text style={styles.cachedNote}>{refreshError}</Text> : null}
                </View>
              </Card>
            ) : null}
            <Button label="Actualizar precios" variant="secondary" loading={refreshing} onPress={refreshPrices} />
            <Button label="Nuevo instrumento" onPress={openNewInstrument} />
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card variant="sage">
              <Text style={styles.emptyText}>
                Todavía no tienes instrumentos. Añade el primero por ticker o manualmente para registrar tus
                operaciones.
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
    totals: {
      gap: spacing.xs,
    },
    totalLabel: {
      ...typography.bodySm,
      color: colors.body,
    },
    totalValue: {
      ...typography.displayXs,
      color: colors.ink,
    },
    totalPnl: {
      ...typography.bodyMdStrong,
    },
    meta: {
      ...typography.caption,
      color: colors.mute,
    },
    note: {
      ...typography.caption,
      color: colors.warningDeep,
    },
    cachedNote: {
      ...typography.caption,
      color: colors.warningDeep,
    },
    emptyText: {
      ...typography.bodyMd,
      color: colors.body,
    },
  });
