import { computeNetWorthEur } from '@/utils/net-worth';

describe('computeNetWorthEur', () => {
  it('sums converted account balances and the priced portfolio value', () => {
    expect(computeNetWorthEur(1500, 850.5)).toBeCloseTo(2350.5);
  });

  it('handles an empty portfolio', () => {
    expect(computeNetWorthEur(1500, 0)).toBe(1500);
  });

  it('handles no accounts', () => {
    expect(computeNetWorthEur(0, 320.75)).toBeCloseTo(320.75);
  });

  it('returns zero when there is nothing to value', () => {
    expect(computeNetWorthEur(0, 0)).toBe(0);
  });
});
