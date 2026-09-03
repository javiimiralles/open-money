import { useSQLiteContext } from 'expo-sqlite';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getThemeMode, saveThemeMode, type ThemeMode } from '@/db/repositories/settings-repo';
import { toSqlExecutor } from '@/db/sqlite-adapter';
import { darkColors, lightColors, type ThemeColors } from '@/theme/palettes';

export type { ThemeMode };

export function resolveIsDark(mode: ThemeMode, systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined): boolean {
  if (mode === 'dark') {
    return true;
  }
  if (mode === 'light') {
    return false;
  }
  return systemScheme === 'dark';
}

export interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  isReady: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => toSqlExecutor(sqlite), [sqlite]);
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    getThemeMode(db)
      .then((stored) => {
        if (active) {
          setModeState(stored);
          setIsReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setIsReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [db]);

  const setMode = useCallback(
    async (next: ThemeMode) => {
      setModeState(next);
      try {
        await saveThemeMode(db, next);
      } catch {
        // Keep the in-memory mode; persistence retries on the next change.
      }
    },
    [db],
  );

  const isDark = resolveIsDark(mode, systemScheme);
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    if (isReady) {
      void SystemUI.setBackgroundColorAsync(colors.canvasSoft);
    }
  }, [colors, isReady]);

  const value = useMemo(
    (): ThemeContextValue => ({ colors, mode, isDark, isReady, setMode }),
    [colors, mode, isDark, isReady, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
