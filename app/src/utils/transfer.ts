/**
 * Pure helpers for transfer FX math (US-005).
 * Kept free of SQLite and React so they are trivially unit-testable.
 */

export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Cross rate from `fromCurrency` to `toCurrency` using stored rates against
 * EUR. EUR is the base currency and always has rate 1. Returns null when a
 * non-EUR currency has no stored rate.
 */
export function crossRate(fromCurrency: string, toCurrency: string, rates: Record<string, number>): number | null {
  if (fromCurrency === toCurrency) {
    return 1;
  }
  const fromRate = fromCurrency === 'EUR' ? 1 : rates[fromCurrency];
  const toRate = toCurrency === 'EUR' ? 1 : rates[toCurrency];
  if (fromRate === undefined || toRate === undefined) {
    return null;
  }
  return toRate / fromRate;
}

/** Destination amount derived from the origin amount and the FX rate. */
export function destinationAmountFromRate(amount: number, rate: number): number {
  return roundToCents(amount * rate);
}

/** FX rate derived from the origin and destination amounts. */
export function rateFromAmounts(amount: number, destinationAmount: number): number {
  return roundToCents(destinationAmount / amount);
}