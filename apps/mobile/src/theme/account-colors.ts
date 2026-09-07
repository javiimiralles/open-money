/**
 * Fixed palette of user-selectable account colors.
 *
 * Seeded from the DESIGN.md brand and illustration accents (primary,
 * accent-orange, accent-cyan, warning, positive, negative) plus two extra
 * hues for variety. Every tone pairs with a legible text color through
 * `pickReadableText` in utils/color.
 */

export const ACCOUNT_COLORS = [
  '#81b760',
  '#38c8ff',
  '#4f9cf9',
  '#b691ff',
  '#ffc091',
  '#ffd11a',
  '#2ead4b',
  '#d03238',
] as const;

export type AccountColor = (typeof ACCOUNT_COLORS)[number];
