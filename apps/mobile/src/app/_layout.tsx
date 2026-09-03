import { Manrope_400Regular, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider, DefaultTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { RecurringNotice } from '@/components/RecurringNotice';
import { migrate, DATABASE_NAME } from '@/db/client';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { useRecurringProcessing } from '@/hooks/use-recurring-processing';
import { colors, spacing, typography } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const onDatabaseInit = (db: SQLiteDatabase) => migrate(toSqlExecutor(db));

function RecurringHost() {
  const { notice, dismiss, undo } = useRecurringProcessing();

  return (
    <>
      {notice ? (
        <View style={hostStyles.noticeWrapper}>
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
      </Stack>
    </>
  );
}

const hostStyles = StyleSheet.create({
  noticeWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.canvasSoft,
  },
});

const onDatabaseError = (error: Error) => {
  console.error('Database initialization failed:', error);
};

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.canvasSoft,
    card: colors.canvas,
    text: colors.ink,
    border: colors.canvasSoft,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={onDatabaseInit} onError={onDatabaseError}>
        <RecurringHost />
      </SQLiteProvider>
    </ThemeProvider>
  );
}