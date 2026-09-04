/**
 * Money parsing and formatting helpers.
 */

export function parseAmount(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, '');
  if (!trimmed) {
    return null;
  }

  let normalized = trimmed;
  const hasDot = normalized.includes('.');
  const hasComma = normalized.includes(',');

  if (hasDot && hasComma) {
    // The last separator is the decimal one; strip the others (thousands).
    const lastDot = normalized.lastIndexOf('.');
    const lastComma = normalized.lastIndexOf(',');
    if (lastDot > lastComma) {
      normalized = normalized.replace(/,/g, '').replace(/\.(?=.*\.)/g, '');
    } else {
      normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (hasComma) {
    normalized = normalized.replace(/,/g, '.');
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Shown in place of any amount when the user hides balances (privacy mode). */
export const MONEY_MASK = '••••••';

export function formatMoney(amount: number, currency: string): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = negative ? '-' : '';
  return `${sign}${grouped},${decPart} ${currency}`;
}

export function formatPercent(ratio: number): string {
  const sign = ratio >= 0 ? '+' : '-';
  const abs = Math.abs(ratio * 100).toFixed(2).replace('.', ',');
  return `${sign}${abs} %`;
}