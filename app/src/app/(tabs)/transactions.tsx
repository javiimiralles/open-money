import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { FilterBar } from '@/components/FilterBar';
import { TransactionFiltersPanel } from '@/components/TransactionFiltersPanel';
import { TransactionRow } from '@/components/TransactionRow';
import { useTransactionFilters } from '@/hooks/use-transaction-filters';
import { useTransactions } from '@/hooks/use-transactions';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatDateEs } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const filters = useTransactionFilters();
  const [panelOpen, setPanelOpen] = useState(false);
  const { groups, summary, loading, loadingMore, hasMore, loadMore } = useTransactions(filters.query);

  const sections = useMemo(
    () =>
      groups.map((group) => ({
        title: group.date,
        total: group.signedTotal,
        currency: group.currency,
        data: group.items,
      })),
    [groups],
  );

  const openTransaction = (id: number) => {
    router.push({ pathname: '/transaction-form', params: { id: String(id) } });
  };

  const closeFilters = () => setPanelOpen(false);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TransactionRow transaction={item} onPress={() => openTransaction(item.id)} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{formatDateEs(section.title)}</Text>
            <Text style={styles.sectionTotal}>
              {section.currency ? formatMoney(section.total, section.currency) : 'Divisas mixtas'}
            </Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        onEndReached={hasMore && !loading ? loadMore : null}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator accessibilityLabel="Cargando más movimientos" /> : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Movimientos</Text>
            <FilterBar
              search={filters.state.search}
              onSearchChange={filters.setSearch}
              activeCount={filters.activeCount}
              activeLabels={filters.activeLabels}
              panelOpen={panelOpen}
              onTogglePanel={() => setPanelOpen((open) => !open)}
              onClear={filters.reset}
            />
            {!loading && summary.count > 0 ? (
              <Card variant="sage" style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  {summary.count} {summary.count === 1 ? 'movimiento' : 'movimientos'}
                  {summary.currency ? ` · ${formatMoney(summary.net, summary.currency)}` : ' · divisas mixtas'}
                </Text>
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card variant="sage">
              <Text style={styles.emptyText}>
                {filters.activeCount > 0
                  ? 'No hay movimientos que coincidan con los filtros.'
                  : 'Todavía no hay movimientos. Usa el botón «+» para registrar el primero.'}
              </Text>
            </Card>
          )
        }
      />
      <Modal visible={panelOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={closeFilters}>
        <Pressable style={styles.modalBackdrop} onPress={closeFilters}>
          <Pressable
            accessibilityLabel="Filtros"
            style={styles.modalCard}
            onPress={() => {
              // Swallow taps inside the card so the backdrop does not close the modal.
            }}>
            <ScrollView bounces={false}>
              <TransactionFiltersPanel
                type={filters.state.type}
                onTypeChange={filters.setType}
                accountId={filters.state.accountId}
                accountOptions={filters.accountOptions}
                onAccountChange={(value) => filters.setAccountId(value === 0 ? null : value)}
                categoryId={filters.state.categoryId}
                categoryOptions={filters.categoryOptions}
                onCategoryChange={(value) => filters.setCategoryId(value === 0 ? null : value)}
                fromDate={filters.state.fromDate}
                toDate={filters.state.toDate}
                onFromDateChange={filters.setFromDate}
                onToDateChange={filters.setToDate}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.paper,
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
    summaryCard: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    summaryText: {
      ...typography.bodyMdStrong,
      color: colors.ink,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    sectionTitle: {
      ...typography.bodySmStrong,
      color: colors.graphite,
    },
    sectionTotal: {
      ...typography.bodySmStrong,
      color: colors.ink,
    },
    emptyText: {
      ...typography.bodyMd,
      color: colors.graphite,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-start',
      padding: spacing.xl,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    modalCard: {
      alignSelf: 'stretch',
      maxWidth: 480,
      marginTop: spacing['3xl'],
      borderRadius: rounded.xl,
      backgroundColor: colors.white,
      shadowColor: colors.ink,
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 24,
      elevation: 12,
    },
  });
