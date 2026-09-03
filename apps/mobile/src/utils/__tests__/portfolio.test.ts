import { computePortfolioTotals, computePortfolioValues } from '@/utils/portfolio';

describe('computePortfolioValues', () => {
  it('values a position in EUR and derives the P&L', () => {
    const values = computePortfolioValues(
      { quantity: 10, invested: 40, lastPrice: 5, currency: 'EUR' },
      {},
    );
    expect(values).toEqual({
      hasPosition: true,
      hasPrice: true,
      investedEur: 40,
      valueEur: 50,
      pnlEur: 10,
      pnlPct: 0.25,
      rateMissing: false,
    });
  });

  it('converts value and invested cost with the stored rate', () => {
    const values = computePortfolioValues(
      { quantity: 2, invested: 200, lastPrice: 120, currency: 'USD' },
      { USD: 0.9 },
    );
    expect(values.valueEur).toBeCloseTo(216);
    expect(values.investedEur).toBeCloseTo(180);
    expect(values.pnlEur).toBeCloseTo(36);
    expect(values.pnlPct).toBeCloseTo(0.2);
    expect(values.rateMissing).toBe(false);
  });

  it('keeps value and P&L unknown when there is no price instead of inventing them', () => {
    const values = computePortfolioValues(
      { quantity: 10, invested: 40, lastPrice: null, currency: 'EUR' },
      {},
    );
    expect(values.hasPosition).toBe(true);
    expect(values.hasPrice).toBe(false);
    expect(values.valueEur).toBeNull();
    expect(values.pnlEur).toBeNull();
    expect(values.pnlPct).toBeNull();
    expect(values.investedEur).toBe(40);
  });

  it('reports no position for a zero quantity', () => {
    const values = computePortfolioValues(
      { quantity: 0, invested: 0, lastPrice: 5, currency: 'EUR' },
      {},
    );
    expect(values.hasPosition).toBe(false);
    expect(values.valueEur).toBeNull();
    expect(values.pnlEur).toBeNull();
  });

  it('flags a missing exchange rate with a 1:1 fallback', () => {
    const values = computePortfolioValues(
      { quantity: 1, invested: 100, lastPrice: 110, currency: 'GBP' },
      {},
    );
    expect(values.rateMissing).toBe(true);
    expect(values.valueEur).toBeCloseTo(110);
    expect(values.investedEur).toBeCloseTo(100);
  });
});

describe('computePortfolioTotals', () => {
  it('aggregates only positions with a known price', () => {
    const totals = computePortfolioTotals([
      computePortfolioValues({ quantity: 10, invested: 40, lastPrice: 5, currency: 'EUR' }, {}),
      computePortfolioValues({ quantity: 5, invested: 100, lastPrice: null, currency: 'EUR' }, {}),
      computePortfolioValues({ quantity: 0, invested: 0, lastPrice: 3, currency: 'EUR' }, {}),
    ]);
    expect(totals.valuedCount).toBe(1);
    expect(totals.unpricedCount).toBe(1);
    expect(totals.totalValueEur).toBe(50);
    expect(totals.totalInvestedEur).toBe(40);
    expect(totals.totalPnlEur).toBe(10);
    expect(totals.totalPnlPct).toBeCloseTo(0.25);
  });

  it('returns null totals when no position has a price', () => {
    const totals = computePortfolioTotals([
      computePortfolioValues({ quantity: 5, invested: 100, lastPrice: null, currency: 'EUR' }, {}),
    ]);
    expect(totals.valuedCount).toBe(0);
    expect(totals.unpricedCount).toBe(1);
    expect(totals.totalPnlEur).toBeNull();
    expect(totals.totalPnlPct).toBeNull();
  });

  it('returns null totals for an empty portfolio', () => {
    expect(computePortfolioTotals([])).toEqual({
      valuedCount: 0,
      unpricedCount: 0,
      totalValueEur: 0,
      totalInvestedEur: 0,
      totalPnlEur: null,
      totalPnlPct: null,
      rateMissing: false,
    });
  });
});
