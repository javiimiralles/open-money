/**
 * Design tokens derived from DESIGN_new.md (Cal.com — Monochrome Utility, Human Touch).
 * Single source of truth for typography, spacing, radii, and shadows.
 * Colors live in ./palettes; `colors` is a light-only alias.
 */

import { lightColors as colors } from './palettes';

export { colors };

// ── Typography ───────────────────────────────────────────────────────
// Headings: Poppins 600 (weight 600 only, never lighter/heavier).
// Body: Inter Light 300 for reading text; Inter 400/600 for compact UI.

export const typography = {
  // Display / headings (Poppins 600)
  displayMega: { fontFamily: 'Poppins_600SemiBold', fontSize: 126, lineHeight: 107.1, letterSpacing: 0.64 },
  displayXxl: { fontFamily: 'Poppins_600SemiBold', fontSize: 96, lineHeight: 81.6, letterSpacing: 0.64 },
  displayXl: { fontFamily: 'Poppins_600SemiBold', fontSize: 64, lineHeight: 54.4, letterSpacing: 0.64 },
  displayLg: { fontFamily: 'Poppins_600SemiBold', fontSize: 48, lineHeight: 48, letterSpacing: 0.48 },
  displayMd: { fontFamily: 'Poppins_600SemiBold', fontSize: 40, lineHeight: 40, letterSpacing: 0.48 },
  displaySm: { fontFamily: 'Poppins_600SemiBold', fontSize: 32, lineHeight: 38.4, letterSpacing: 0.24 },
  displayXs: { fontFamily: 'Poppins_600SemiBold', fontSize: 24, lineHeight: 31.2, letterSpacing: 0.24 },

  // Body / reading (Inter Light 300)
  bodyLg: { fontFamily: 'Inter_300Light', fontSize: 18, lineHeight: 25.2, letterSpacing: -0.2 },
  bodyMd: { fontFamily: 'Inter_300Light', fontSize: 16, lineHeight: 24, letterSpacing: -0.19 },
  bodyMdStrong: { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600', lineHeight: 24 },
  bodySm: { fontFamily: 'Inter_300Light', fontSize: 14, lineHeight: 21, letterSpacing: -0.2 },
  bodySmStrong: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: -0.2 },
  caption: { fontFamily: 'Inter_300Light', fontSize: 12, lineHeight: 16.8, letterSpacing: -0.24 },

  // Buttons / compact UI (Inter 600)
  buttonMd: { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600', lineHeight: 24 },
} as const;

// ── Spacing (4 px rhythm) ───────────────────────────────────────────

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ── Border radius ───────────────────────────────────────────────────
// Inputs: 8px · Cards: 12px · Pills/tags: 9999px.

export const rounded = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
  full: 9999,
} as const;

// ── Shadows ─────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#242424',
    shadowOpacity: 0.07,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  card: {
    shadowColor: '#242424',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export type ColorName = keyof typeof colors;
export type TypographyName = keyof typeof typography;
