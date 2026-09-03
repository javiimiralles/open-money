import { Stack, useRouter } from 'expo-router';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import type { Category } from '@/db/repositories/categories-repo';
import { useCategories } from '@/hooks/use-categories';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export default function CategoriesScreen() {
  const router = useRouter();
  const { sections, loading } = useCategories();

  const openNewCategory = () => {
    router.push('/category-form');
  };

  const openCategory = (category: Category) => {
    router.push({ pathname: '/category-form', params: { id: String(category.id) } });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Categorías' }} />
      <View style={styles.screen}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => openCategory(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>
              {section.title} · {section.data.length}
            </Text>
          )}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <Button label="Nueva categoría" onPress={openNewCategory} />
            </View>
          }
          ListEmptyComponent={
            loading ? null : (
              <Card variant="sage">
                <Text style={styles.emptyText}>Todavía no tienes categorías.</Text>
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
  sectionTitle: {
    ...typography.bodySmStrong,
    color: colors.body,
  },
  row: {
    backgroundColor: colors.canvas,
    borderRadius: rounded.xl,
    padding: spacing.xl,
  },
  rowPressed: {
    opacity: 0.85,
  },
  name: {
    ...typography.bodyMdStrong,
    color: colors.ink,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.body,
  },
});
