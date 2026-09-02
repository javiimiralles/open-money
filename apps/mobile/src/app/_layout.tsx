import { Manrope_400Regular, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider, DefaultTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';

import { migrate, DATABASE_NAME } from '@/db/client';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { colors, typography } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const onDatabaseInit = (db: SQLiteDatabase) => migrate(toSqlExecutor(db));

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
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}