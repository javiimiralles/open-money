/**
 * Settings repository backed by the `settings` key/value table.
 * Values are stored as JSON strings.
 */

import type { SqlExecutor } from '../client';

export const SETTINGS_KEYS = {
  themeMode: 'theme_mode',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export async function getSetting(db: SqlExecutor, key: SettingsKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(db: SqlExecutor, key: SettingsKey, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

export async function getThemeMode(db: SqlExecutor): Promise<ThemeMode> {
  const raw = await getSetting(db, SETTINGS_KEYS.themeMode);
  return isThemeMode(raw) ? raw : DEFAULT_THEME_MODE;
}

export async function saveThemeMode(db: SqlExecutor, mode: ThemeMode): Promise<void> {
  await setSetting(db, SETTINGS_KEYS.themeMode, mode);
}