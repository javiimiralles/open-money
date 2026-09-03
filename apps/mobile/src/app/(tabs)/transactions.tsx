import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { FilterBar } from '@/components/FilterBar';
import { TransactionFiltersPanel } from '@/components/TransactionFiltersPanel';
import { TransactionRow } from '@/components/TransactionRow';
import { useTransactionFilters } from '@/hooks/use-transaction-filters';
import { useTransactions } from '@/hooks/use-transactions';
import { spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { formatDateEs } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const filters = useTransactionFilters();
  const [panelOpen, setPanelOpen] = useState(false);
  const { groups, summary, loading } = useTransactions(filters.query);

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

  return (
    <View style={styles.screen}>
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
            {panelOpen ? (
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
            ) : null}
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
      color: colors.body,
    },
    sectionTotal: {
      ...typography.bodySmStrong,
      color: colors.ink,
    },
    emptyText: {
      ...typography.bodyMd,
      color: colors.body,
    },
  });
