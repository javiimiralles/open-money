/**
 * Light and dark color palettes derived from DESIGN.md (version alpha).
 * Single source of truth for theme colors.
 *
 * The dark palette follows the brand's polarity-flip precedent
 * (hero-band-dark, footer): ink becomes the page canvas, canvas-soft
 * becomes the text color, the brand green stays untouched, and semantic
 * values are lifted for contrast on dark surfaces.
 */

export const lightColors = {
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

export type ThemeColorKey = keyof typeof lightColors;
export type ThemeColors = Record<ThemeColorKey, string>;

export const darkColors: ThemeColors = {
  primary: '#9fe870',
  onPrimary: '#0e0f0c',
  primaryActive: '#cdffad',
  primaryNeutral: '#2f4423',
  primaryPale: '#1c2a16',
  ink: '#e8ebe6',
  inkDeep: '#b7e39b',
  body: '#b7bab5',
  mute: '#8f918d',
  canvas: '#1a1c19',
  canvasSoft: '#0e0f0c',
  positive: '#58d06f',
  positiveDeep: '#7fd97a',
  warning: '#ffd11a',
  warningDeep: '#e8b34b',
  warningContent: '#4a3b1c',
  negative: '#ff5f57',
  negativeDeep: '#ff7a70',
  negativeDarkest: '#ff6b61',
  negativeBg: '#320707',
  accentOrange: '#ffc091',
  accentCyan: '#38c8ff',
};
