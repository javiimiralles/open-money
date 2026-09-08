import { Inter_300Light, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavigationThemeProvider, DefaultTheme } from 'expo-router';
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
import { ThemeProvider, useTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

const onDatabaseInit = (db: SQLiteDatabase) => migrate(toSqlExecutor(db));

function RecurringHost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(insets.top), [insets.top]);
  const { notice, dismiss, undo } = useRecurringProcessing();

  return (
    <>
      {notice ? (
        <View style={styles.noticeWrapper} pointerEvents="box-none">
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
            headerStyle: { backgroundColor: colors.white },
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
            headerStyle: { backgroundColor: colors.white },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="categories"
          options={{
            headerShown: true,
            title: 'Categorías',
            headerStyle: { backgroundColor: colors.white },
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
            headerStyle: { backgroundColor: colors.white },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="recurring"
          options={{
            headerShown: true,
            title: 'Pagos recurrentes',
            headerStyle: { backgroundColor: colors.white },
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
            headerStyle: { backgroundColor: colors.white },
            headerTitleStyle: typography.bodyMdStrong,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}

const makeStyles = (topInset: number) =>
  StyleSheet.create({
    // Floating overlay: never shifts the screens below.
    noticeWrapper: {
      position: 'absolute',
      top: topInset + spacing.sm,
      left: spacing.lg,
      right: spacing.lg,
      zIndex: 10,
      elevation: 10,
    },
  });

const onDatabaseError = (error: Error) => {
  console.error('Database initialization failed:', error);
  void SplashScreen.hideAsync();
};

function ThemedApp() {
  const { colors, isReady } = useTheme();

  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.ink,
        background: colors.paper,
        card: colors.white,
        text: colors.ink,
        border: colors.paper,
      },
    }),
    [colors],
  );

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
      <StatusBar style="dark" />
      <RecurringHost />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Inter_300Light,
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
