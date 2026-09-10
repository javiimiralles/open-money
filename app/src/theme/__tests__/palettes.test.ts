import { lightColors } from '../palettes';

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

describe('theme palettes', () => {
  it('every value in the light palette is a valid 6-digit hex color', () => {
    for (const value of Object.values(lightColors)) {
      expect(value).toMatch(HEX_COLOR_PATTERN);
    }
  });

  it('has the core brand tokens', () => {
    expect(lightColors.ink).toBe('#101010');
    expect(lightColors.paper).toBe('#f4f4f4');
    expect(lightColors.white).toBe('#ffffff');
  });

  it('has semantic colors', () => {
    expect(lightColors.positive).toBeDefined();
    expect(lightColors.warning).toBeDefined();
    expect(lightColors.negative).toBeDefined();
  });
});
