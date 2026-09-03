import { darkColors, lightColors } from '../palettes';

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

describe('theme palettes', () => {
  it('dark palette covers exactly the same keys as the light palette', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('every value in both palettes is a valid 6-digit hex color', () => {
    for (const palette of [lightColors, darkColors]) {
      for (const value of Object.values(palette)) {
        expect(value).toMatch(HEX_COLOR_PATTERN);
      }
    }
  });

  it('keeps the brand green identical in both modes', () => {
    expect(darkColors.primary).toBe(lightColors.primary);
    expect(darkColors.onPrimary).toBe(lightColors.onPrimary);
  });

  it('flips page and text polarity between modes', () => {
    expect(darkColors.canvasSoft).toBe(lightColors.ink);
    expect(darkColors.ink).toBe(lightColors.canvasSoft);
  });
});
