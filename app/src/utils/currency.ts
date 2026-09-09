/**
 * EUR conversion helpers.
 *
 * Rates come from the `exchange_rates` table. Until US-007 provides rate
 * management, a currency without a stored rate falls back to 1:1 and is
 * flagged so the UI can warn the user.
 */

import type { SqlExecutor } from '@/db/client';
import type { AccountWithBalance } from '@/db/repositories/accounts-repo';
import type { AccountListItem } from '@/hooks/use-accounts';

export interface EurConversion {
  amountEur: number;
  rate: number;
  rateMissing: boolean;
}

export async function getLatestRatesToEur(db: SqlExecutor): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ currency: string; rate_to_eur: number }>(
    `SELECT er.currency, er.rate_to_eur
     FROM exchange_rates er
     JOIN (
       SELECT currency, MAX(id) AS max_id
       FROM exchange_rates
       GROUP BY currency
     ) latest ON latest.currency = er.currency AND latest.max_id = er.id`,
  );
  const rates: Record<string, number> = {};
  for (const row of rows) {
    rates[row.currency] = row.rate_to_eur;
  }
  return rates;
}

export function convertToEur(amount: number, currency: string, rates: Record<string, number>): EurConversion {
  if (currency === 'EUR') {
    return { amountEur: amount, rate: 1, rateMissing: false };
  }
  const rate = rates[currency];
  if (rate === undefined) {
    return { amountEur: amount, rate: 1, rateMissing: true };
  }
  return { amountEur: amount * rate, rate, rateMissing: false };
}

/** Attaches the EUR equivalent to every account for card lists. */
export function toAccountListItems(
  accounts: AccountWithBalance[],
  rates: Record<string, number>,
): AccountListItem[] {
  return accounts.map((account) => {
    const conversion = convertToEur(account.balance, account.currency, rates);
    return { ...account, eurEquivalent: conversion.amountEur, rateMissing: conversion.rateMissing };
  });
}
