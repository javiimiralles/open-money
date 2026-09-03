import { parseHexColor, pickReadableText, relativeLuminance } from '@/utils/color';

describe('color', () => {
  it('parses 6-digit hex colors', () => {
    expect(parseHexColor('#9fe870')).toEqual({ r: 159, g: 232, b: 112 });
  });

  it('parses 3-digit hex colors', () => {
    expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('rejects invalid color strings', () => {
    expect(parseHexColor('red')).toBeNull();
    expect(parseHexColor('#12')).toBeNull();
    expect(parseHexColor('#gggggg')).toBeNull();
    expect(parseHexColor('9fe870')).toBeNull();
  });

  it('computes luminance 1 for white and 0 for black', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBe(1);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
  });

  it('picks dark text over light backgrounds', () => {
    expect(pickReadableText('#ffffff').primary).toBe('#0e0f0c');
    expect(pickReadableText('#9fe870').primary).toBe('#0e0f0c');
    expect(pickReadableText('#ffd11a').primary).toBe('#0e0f0c');
  });

  it('picks light text over dark backgrounds', () => {
    expect(pickReadableText('#000000').primary).toBe('#ffffff');
    expect(pickReadableText('#d03238').primary).toBe('#ffffff');
  });

  it('picks the pair with the highest contrast ratio', () => {
    expect(pickReadableText('#2ead4b').primary).toBe('#0e0f0c');
  });

  it('falls back to dark text on invalid input', () => {
    expect(pickReadableText('invalid').primary).toBe('#0e0f0c');
  });
});
