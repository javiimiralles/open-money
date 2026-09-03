/**
 * Net worth aggregation (US-012).
 *
 * Net worth is the sum of converted account balances and the priced
 * portfolio value. Positions without a known price stay excluded,
 * matching the portfolio totals from US-011.
 */

export function computeNetWorthEur(accountsEur: number, portfolioEur: number): number {
  return accountsEur + portfolioEur;
}
