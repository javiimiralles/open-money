import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TradeRow } from '@/components/TradeRow';
import { useInstrumentDetail } from '@/hooks/use-instrument-detail';
import { colors, spacing, typography } from '@/theme/tokens';
import { formatDateEs } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export default function InstrumentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const instrumentId = params.id ? Number(params.id) : 0;
  const { instrument, position, trades, loading } = useInstrumentDetail(instrumentId);

  const openTradeForm = (type: 'buy' | 'sell') => {
    router.push({ pathname: '/trade-form', params: { instrumentId: String(instrumentId), type } });
  };

  return (
    <>
      <Stack.Screen options={{ title: instrument ? instrument.symbol : 'Detalle' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {loading || !instrument ? (
          <Card>
            <Text style={styles.empty}>{loading ? 'Cargando…' : 'Instrumento no encontrado.'}</Text>
          </Card>
        ) : (
          <>
            <Card>
              <View style={styles.section}>
                <Text style={styles.name}>{instrument.name}</Text>
                <Text style={styles.meta}>
                  {instrument.symbol} · {instrument.currency}
                  {instrument.market ? ` · ${instrument.market}` : ''}
                  {instrument.isin ? ` · ISIN ${instrument.isin}` : ''}
                </Text>
              </View>
            </Card>
            <Card>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Posición</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Cantidad</Text>
                  <Text style={styles.statValue}>{position.quantity}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Precio medio</Text>
                  <Text style={styles.statValue}>{formatMoney(position.avgCost, instrument.currency)}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Invertido</Text>
                  <Text style={styles.statValue}>{formatMoney(position.invested, instrument.currency)}</Text>
                </View>
                {instrument.lastPrice !== null ? (
                  <Text style={styles.lastPrice}>
                    Último precio conocido: {formatMoney(instrument.lastPrice, instrument.currency)}
                    {instrument.lastPriceAt ? ` (${formatDateEs(instrument.lastPriceAt.slice(0, 10))})` : ''}
                  </Text>
                ) : null}
              </View>
            </Card>
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button label="Registrar compra" onPress={() => openTradeForm('buy')} />
              </View>
              <View style={styles.action}>
                <Button label="Registrar venta" variant="secondary" onPress={() => openTradeForm('sell')} />
              </View>
            </View>
            <Text style={styles.sectionTitle}>Operaciones</Text>
            {trades.length === 0 ? (
              <Card variant="sage">
                <Text style={styles.empty}>Sin operaciones todavía. Registra la primera compra.</Text>
              </Card>
            ) : (
              trades.map((trade) => <TradeRow key={trade.id} trade={trade} />)
            )}
          </>
        )}
      </ScrollView>
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
  section: {
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  meta: {
    ...typography.caption,
    color: colors.mute,
  },
  sectionTitle: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  statLabel: {
    ...typography.bodySm,
    color: colors.body,
  },
  statValue: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  lastPrice: {
    ...typography.caption,
    color: colors.mute,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
  empty: {
    ...typography.bodyMd,
    color: colors.body,
  },
});
