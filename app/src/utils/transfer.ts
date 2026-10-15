/**
 * Pure helpers for transfer FX math (US-005).
 * Kept free of SQLite and React so they are trivially unit-testable.
 */

import { parseAmount } from '@/utils/money';

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
  return destinationAmount / amount;
}

/** Strips float noise from a rate for display in a form field, keeping 12 significant digits. */
function formatRate(rate: number): string {
  return String(Number(rate.toPrecision(12)));
}

export interface TransferFormValues {
  amount: string;
  accountId: number | null;
  destinationAccountId: number | null;
  destinationAmount: string;
  fxRate: string;
}

interface CurrencyAccount {
  id: number;
  currency: string;
}

function findPair(values: TransferFormValues, accounts: CurrencyAccount[]) {
  return {
    origin: accounts.find((account) => account.id === values.accountId),
    destination: accounts.find((account) => account.id === values.destinationAccountId),
  };
}

/**
 * Recomputes the destination amount and FX rate for a transfer when the
 * origin/destination accounts change or the type switches to transfer.
 * Same-currency transfers keep destinationAmount = amount and no rate;
 * cross-currency ones prefill the rate from the stored rates when available.
 */
export function transferDefaults(
  values: TransferFormValues,
  accounts: CurrencyAccount[],
  rates: Record<string, number>,
): Pick<TransferFormValues, 'destinationAmount' | 'fxRate'> {
  const { origin, destination } = findPair(values, accounts);
  if (!origin || !destination) {
    return { destinationAmount: '', fxRate: '' };
  }
  const amount = parseAmount(values.amount);
  if (origin.currency === destination.currency) {
    return { destinationAmount: amount !== null ? String(amount) : '', fxRate: '' };
  }
  const rate = crossRate(origin.currency, destination.currency, rates);
  if (rate === null || amount === null) {
    return { destinationAmount: '', fxRate: '' };
  }
  return { destinationAmount: String(destinationAmountFromRate(amount, rate)), fxRate: formatRate(rate) };
}

/** Applies a new origin amount to a transfer, keeping destination amount and rate consistent. */
export function applyTransferAmount<T extends TransferFormValues>(
  values: T,
  amount: string,
  accounts: CurrencyAccount[],
  rates: Record<string, number>,
): T {
  const next = { ...values, amount };
  const { origin, destination } = findPair(next, accounts);
  if (!origin || !destination) {
    return next;
  }
  const parsed = parseAmount(amount);
  if (origin.currency === destination.currency) {
    next.destinationAmount = parsed !== null ? String(parsed) : '';
    next.fxRate = '';
    return next;
  }
  const rate = parseAmount(next.fxRate);
  if (parsed !== null && rate !== null && rate > 0) {
    next.destinationAmount = String(destinationAmountFromRate(parsed, rate));
  } else if (parsed !== null) {
    // No rate yet (e.g. accounts picked before the amount): prefill.
    const prefilled = crossRate(origin.currency, destination.currency, rates);
    if (prefilled !== null) {
      next.fxRate = formatRate(prefilled);
      next.destinationAmount = String(destinationAmountFromRate(parsed, prefilled));
    }
  }
  return next;
}

/** Applies a new FX rate to a transfer, recomputing the destination amount when possible. */
export function applyTransferFxRate<T extends TransferFormValues>(values: T, fxRate: string): T {
  const next = { ...values, fxRate };
  const amount = parseAmount(next.amount);
  const rate = parseAmount(fxRate);
  if (amount !== null && amount > 0 && rate !== null && rate > 0) {
    next.destinationAmount = String(destinationAmountFromRate(amount, rate));
  }
  return next;
}

/** Applies a new destination amount to a transfer, recomputing the FX rate when possible. */
export function applyTransferDestinationAmount<T extends TransferFormValues>(values: T, destinationAmount: string): T {
  const next = { ...values, destinationAmount };
  const amount = parseAmount(next.amount);
  const destination = parseAmount(destinationAmount);
  if (amount !== null && amount > 0 && destination !== null && destination > 0) {
    next.fxRate = formatRate(rateFromAmounts(amount, destination));
  }
  return next;
}