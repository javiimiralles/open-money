import { formatMoney, parseAmount } from '@/utils/money';

describe('parseAmount', () => {
  it('parses dot-decimal amounts', () => {
    expect(parseAmount('1234.56')).toBe(1234.56);
  });

  it('parses comma-decimal amounts', () => {
    expect(parseAmount('1234,56')).toBe(1234.56);
  });

  it('parses amounts with thousands separators', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
  });

  it('parses zero and integer amounts', () => {
    expect(parseAmount('0')).toBe(0);
    expect(parseAmount('100')).toBe(100);
  });

  it('parses negative amounts', () => {
    expect(parseAmount('-50.5')).toBe(-50.5);
  });

  it('trims surrounding whitespace', () => {
    expect(parseAmount('  12,50  ')).toBe(12.5);
  });

  it('returns null for empty input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('12a')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('formats with es-ES grouping and currency code', () => {
    expect(formatMoney(1234.56, 'EUR')).toBe('1.234,56 EUR');
  });

  it('formats zero', () => {
    expect(formatMoney(0, 'EUR')).toBe('0,00 EUR');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-50.5, 'USD')).toBe('-50,50 USD');
  });

  it('formats thousands', () => {
    expect(formatMoney(1000, 'EUR')).toBe('1.000,00 EUR');
  });
});