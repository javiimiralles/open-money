/**
 * Fixed categorical palette for the statistics donut chart.
 *
 * Seeded from the DESIGN.md brand and illustration accents (accent-orange,
 * accent-cyan, warning) plus extra hues for segment distinction, following
 * the ACCOUNT_COLORS precedent. Every tone stays legible in light and dark
 * mode. Segments beyond the palette length cycle back to the start; the
 * "Otros" aggregate always renders in the theme `mute` color instead.
 */

export const CHART_COLORS = [
  '#38c8ff',
  '#4f9cf9',
  '#b691ff',
  '#ef6f9c',
  '#ffc091',
  '#ffd11a',
  '#2dd4bf',
  '#94a3b8',
] as const;

export type ChartColor = (typeof CHART_COLORS)[number];

/** Assigns palette colors round-robin by segment index. */
export function chartColorAt(index: number): ChartColor {
  return CHART_COLORS[index % CHART_COLORS.length];
}
