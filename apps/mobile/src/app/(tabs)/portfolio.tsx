import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InstrumentRow } from '@/components/InstrumentRow';
import { useInstruments } from '@/hooks/use-instruments';
import { colors, spacing, typography } from '@/theme/tokens';

export default function PortfolioScreen() {
  const router = useRouter();
  const { items, loading } = useInstruments();

  const openNewInstrument = () => {
    router.push('/instrument-search');
  };

  const openInstrument = (id: number) => {
    router.push({ pathname: '/instrument-detail', params: { id: String(id) } });
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <InstrumentRow item={item} onPress={() => openInstrument(item.id)} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Cartera</Text>
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
  title: {
    ...typography.displayXs,
    color: colors.ink,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.body,
  },
});
