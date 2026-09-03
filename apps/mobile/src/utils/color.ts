/**
 * Readable text colors over arbitrary colored surfaces.
 *
 * Computes WCAG relative luminance from a hex background and picks the
 * dark or light text pair with the highest contrast ratio, so account
 * cards stay legible regardless of the user-chosen color.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface ReadableTextColors {
  primary: string;
  secondary: string;
}

const DARK_TEXT: ReadableTextColors = {
  primary: '#0e0f0c',
  secondary: 'rgba(14, 15, 12, 0.65)',
};

const LIGHT_TEXT: ReadableTextColors = {
  primary: '#ffffff',
  secondary: 'rgba(255, 255, 255, 0.8)',
};

export function parseHexColor(value: string): RgbColor | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) {
    return null;
  }
  const hex = match[1];
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function channelLuminance(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: RgbColor): number {
  return (
    0.2126 * channelLuminance(color.r) +
    0.7152 * channelLuminance(color.g) +
    0.0722 * channelLuminance(color.b)
  );
}

function contrastRatio(first: number, second: number): number {
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns the dark or light text pair with the best contrast over the
 * given hex background. Falls back to dark text on invalid input.
 */
export function pickReadableText(background: string): ReadableTextColors {
  const parsed = parseHexColor(background);
  if (!parsed) {
    return DARK_TEXT;
  }
  const backgroundLuminance = relativeLuminance(parsed);
  const darkLuminance = relativeLuminance({ r: 0x0e, g: 0x0f, b: 0x0c });
  return contrastRatio(backgroundLuminance, darkLuminance) >= contrastRatio(backgroundLuminance, 1)
    ? DARK_TEXT
    : LIGHT_TEXT;
}
