import { useSQLiteContext } from 'expo-sqlite';
import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { lightColors, type ThemeColors } from '@/theme/palettes';

export type { ThemeColors } from '@/theme/palettes';

export interface ThemeContextValue {
  colors: ThemeColors;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const _sqlite = useSQLiteContext();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(lightColors.paper);
  }, []);

  const value = useMemo(
    (): ThemeContextValue => ({ colors: lightColors, isReady: true }),
    [],
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
