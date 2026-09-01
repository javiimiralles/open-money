import { Manrope_400Regular, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider, DefaultTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';

import { migrate, DATABASE_NAME } from '@/db/client';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

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
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={(db) => migrate(toSqlExecutor(db))}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}