/**
 * Design tokens derived from DESIGN.md (version alpha).
 * Single source of truth for colors, typography, spacing, and radii.
 */

export const colors = {
  primary: '#9fe870',
  onPrimary: '#0e0f0c',
  primaryActive: '#cdffad',
  primaryNeutral: '#c5edab',
  primaryPale: '#e2f6d5',
  ink: '#0e0f0c',
  inkDeep: '#163300',
  body: '#454745',
  mute: '#868685',
  canvas: '#ffffff',
  canvasSoft: '#e8ebe6',
  positive: '#2ead4b',
  positiveDeep: '#054d28',
  warning: '#ffd11a',
  warningDeep: '#b86700',
  warningContent: '#4a3b1c',
  negative: '#d03238',
  negativeDeep: '#a72027',
  negativeDarkest: '#a7000d',
  negativeBg: '#320707',
  accentOrange: '#ffc091',
  accentCyan: '#38c8ff',
} as const;

export const typography = {
  displayMega: { fontFamily: 'Manrope_800ExtraBold', fontSize: 126, fontWeight: '900', lineHeight: 107.1 },
  displayXxl: { fontFamily: 'Manrope_800ExtraBold', fontSize: 96, fontWeight: '900', lineHeight: 81.6 },
  displayXl: { fontFamily: 'Manrope_800ExtraBold', fontSize: 64, fontWeight: '900', lineHeight: 54.4 },
  displayLg: { fontFamily: 'Manrope_400Regular', fontSize: 47, fontWeight: '400', lineHeight: 70.5, letterSpacing: -0.108 },
  displayMd: { fontFamily: 'Manrope_800ExtraBold', fontSize: 40, fontWeight: '900', lineHeight: 34 },
  displaySm: { fontFamily: 'Inter_600SemiBold', fontSize: 32, fontWeight: '600', lineHeight: 38.4, letterSpacing: -0.96 },
  displayXs: { fontFamily: 'Inter_600SemiBold', fontSize: 24, fontWeight: '600', lineHeight: 31.2, letterSpacing: -0.48 },
  bodyLg: { fontFamily: 'Inter_400Regular', fontSize: 20, fontWeight: '400', lineHeight: 30 },
  bodyMd: { fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMdStrong: { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600', lineHeight: 24 },
  bodySm: { fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySmStrong: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '400', lineHeight: 16 },
  buttonMd: { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600', lineHeight: 24 },
} as const;

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

export const rounded = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
  full: 9999,
} as const;

export type ColorName = keyof typeof colors;
export type TypographyName = keyof typeof typography;
