/**
 * Light color palette derived from DESIGN_new.md (Cal.com — Monochrome Utility, Human Touch).
 * Single source of truth for theme colors. Dark mode has been removed.
 *
 * Semantic colors (positive, warning, negative) are retained from the
 * previous design system because DESIGN_new.md does not define equivalents.
 * Account and chart palettes also remain unchanged.
 */

export const lightColors = {
  // Brand / accent
  ink: '#101010',
  actionBlue: '#0099ff',

  // Surfaces
  white: '#ffffff',
  paper: '#f4f4f4',

  // Text
  graphite: '#242424',
  slate: '#6b7280',
  stone: '#898989',

  // Borders / inputs
  silver: '#e5e7eb',

  // Info banner
  infoBannerBg: '#eff6fe',

  // Semantic (retained from previous system)
  positive: '#2ead4b',
  positiveDeep: '#054d28',
  warning: '#ffd11a',
  warningDeep: '#b86700',
  warningContent: '#4a3b1c',
  negative: '#d03238',
  negativeDeep: '#a72027',
  negativeDarkest: '#a7000d',
  negativeBg: '#320707',
} as const;

export type ThemeColorKey = keyof typeof lightColors;
export type ThemeColors = Record<ThemeColorKey, string>;
