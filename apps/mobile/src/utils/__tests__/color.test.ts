import { parseHexColor, pickReadableText, relativeLuminance } from '@/utils/color';

describe('color', () => {
  it('parses 6-digit hex colors', () => {
    expect(parseHexColor('#101010')).toEqual({ r: 16, g: 16, b: 16 });
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
    expect(pickReadableText('#ffffff').primary).toBe('#101010');
    expect(pickReadableText('#f4f4f4').primary).toBe('#101010');
    expect(pickReadableText('#ffd11a').primary).toBe('#101010');
  });

  it('picks light text over dark backgrounds', () => {
    expect(pickReadableText('#000000').primary).toBe('#ffffff');
    expect(pickReadableText('#d03238').primary).toBe('#ffffff');
  });

  it('picks the pair with the highest contrast ratio', () => {
    expect(pickReadableText('#2ead4b').primary).toBe('#101010');
  });

  it('falls back to dark text on invalid input', () => {
    expect(pickReadableText('invalid').primary).toBe('#101010');
  });
});
