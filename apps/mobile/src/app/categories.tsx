import { useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import type { Category } from '@/db/repositories/categories-repo';
import { useCategories } from '@/hooks/use-categories';
import { rounded, spacing, typography } from '@/theme/tokens';
import { useTheme, type ThemeColors } from '@/theme/theme';
import { resolveCategoryIcon } from '@/utils/category-icons';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name={resolveCategoryIcon(item.icon)}
                  size={22}
                  color={colors.ink}
                />
              </View>
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
    sectionTitle: {
      ...typography.bodySmStrong,
      color: colors.body,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.canvas,
      borderRadius: rounded.xl,
      padding: spacing.xl,
    },
    rowPressed: {
      opacity: 0.85,
    },
    iconCircle: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: rounded.full,
      backgroundColor: colors.canvasSoft,
    },
    name: {
      ...typography.bodyMdStrong,
      color: colors.ink,
      flex: 1,
    },
    emptyText: {
      ...typography.bodyMd,
      color: colors.body,
    },
  });
