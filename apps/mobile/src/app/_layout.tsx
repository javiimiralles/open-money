import { Manrope_400Regular, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavigationThemeProvider, DefaultTheme, DarkTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecurringNotice } from '@/components/RecurringNotice';
import { migrate, DATABASE_NAME } from '@/db/client';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { useRecurringProcessing } from '@/hooks/use-recurring-processing';
import { spacing, typography } from '@/theme/tokens';
import { ThemeProvider, useTheme, type ThemeColors } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

const onDatabaseInit = (db: SQLiteDatabase) => migrate(toSqlExecutor(db));

function RecurringHost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, insets.top), [colors, insets.top]);
  const { notice, dismiss, undo } = useRecurringProcessing();

  return (
    <>
      {notice ? (
        <View style={styles.noticeWrapper}>
          <RecurringNotice count={notice.count} onUndo={undo} onDismiss={dismiss} />
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="account-form"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Nueva cuenta',
            headerStyle: { backgroundColor: colors.canvas },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="transaction-form"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Nuevo movimiento',
            headerStyle: { backgroundColor: colors.canvas },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="categories"
          options={{
            headerShown: true,
            title: 'Categorías',
            headerStyle: { backgroundColor: colors.canvas },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="category-form"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Nueva categoría',
            headerStyle: { backgroundColor: colors.canvas },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="recurring"
          options={{
            headerShown: true,
            title: 'Pagos recurrentes',
            headerStyle: { backgroundColor: colors.canvas },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="recurring-form"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Nueva regla',
            headerStyle: { backgroundColor: colors.canvas },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="instrument-search"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Añadir instrumento',
            headerStyle: { backgroundColor: colors.canvas },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="trade-form"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Registrar operación',
            headerStyle: { backgroundColor: colors.canvas },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="instrument-detail"
          options={{
            headerShown: true,
            title: 'Detalle',
            headerStyle: { backgroundColor: colors.canvas },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}

const makeStyles = (colors: ThemeColors, topInset: number) =>
  StyleSheet.create({
    noticeWrapper: {
      paddingHorizontal: spacing.lg,
      paddingTop: topInset + spacing.sm,
      backgroundColor: colors.canvasSoft,
    },
  });

const onDatabaseError = (error: Error) => {
  console.error('Database initialization failed:', error);
  void SplashScreen.hideAsync();
};

function ThemedApp() {
  const { colors, isDark, isReady } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.canvasSoft,
        card: colors.canvas,
        text: colors.ink,
        border: colors.canvasSoft,
      },
    };
  }, [colors, isDark]);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RecurringHost />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={onDatabaseInit} onError={onDatabaseError}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
