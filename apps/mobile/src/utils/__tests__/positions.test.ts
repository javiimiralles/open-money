import { computePosition, holdingsAtDate } from '@/utils/positions';

describe('computePosition', () => {
  it('returns zeros for an empty history', () => {
    expect(computePosition([])).toEqual({ quantity: 0, avgCost: 0, invested: 0, negativeAt: null });
  });

  it('computes a weighted average across buys regardless of input order', () => {
    const summary = computePosition([
      { id: 2, date: '2026-09-02', type: 'buy', quantity: 10, price: 5 },
      { id: 1, date: '2026-09-01', type: 'buy', quantity: 10, price: 3 },
    ]);
    expect(summary.quantity).toBe(20);
    expect(summary.avgCost).toBeCloseTo(4);
    expect(summary.invested).toBeCloseTo(80);
    expect(summary.negativeAt).toBeNull();
  });

  it('keeps the average on partial sells and reduces the invested cost', () => {
    const summary = computePosition([
      { id: 1, date: '2026-09-01', type: 'buy', quantity: 10, price: 4 },
      { id: 2, date: '2026-09-05', type: 'sell', quantity: 4, price: 6 },
    ]);
    expect(summary.quantity).toBe(6);
    expect(summary.avgCost).toBeCloseTo(4);
    expect(summary.invested).toBeCloseTo(24);
    expect(summary.negativeAt).toBeNull();
  });

  it('resets to zero on a full sell', () => {
    const summary = computePosition([
      { id: 1, date: '2026-09-01', type: 'buy', quantity: 10, price: 4 },
      { id: 2, date: '2026-09-05', type: 'sell', quantity: 10, price: 6 },
    ]);
    expect(summary).toEqual({ quantity: 0, avgCost: 0, invested: 0, negativeAt: null });
  });

  it('flags the date of an oversell', () => {
    const summary = computePosition([
      { id: 1, date: '2026-09-01', type: 'buy', quantity: 10, price: 4 },
      { id: 2, date: '2026-09-05', type: 'sell', quantity: 12, price: 6 },
    ]);
    expect(summary.quantity).toBe(-2);
    expect(summary.negativeAt).toBe('2026-09-05');
  });

  it('flags a sell dated before its buy', () => {
    const summary = computePosition([
      { id: 1, date: '2026-09-05', type: 'buy', quantity: 10, price: 4 },
      { id: 2, date: '2026-09-01', type: 'sell', quantity: 2, price: 6 },
    ]);
    expect(summary.negativeAt).toBe('2026-09-01');
  });

  it('settles same-day buys before sells', () => {
    const summary = computePosition([
      { id: 1, date: '2026-09-01', type: 'sell', quantity: 5, price: 6 },
      { id: 2, date: '2026-09-01', type: 'buy', quantity: 10, price: 4 },
    ]);
    expect(summary.quantity).toBe(5);
    expect(summary.negativeAt).toBeNull();
  });

  it('rejects a same-day sell with no buy', () => {
    const summary = computePosition([{ date: '2026-09-01', type: 'sell', quantity: 5, price: 6 }]);
    expect(summary.negativeAt).toBe('2026-09-01');
  });

  it('absorbs floating point dust on a full sell', () => {
    const summary = computePosition([
      { date: '2026-09-01', type: 'buy', quantity: 0.1, price: 3 },
      { date: '2026-09-02', type: 'buy', quantity: 0.2, price: 3 },
      { date: '2026-09-03', type: 'sell', quantity: 0.3, price: 4 },
    ]);
    expect(summary).toEqual({ quantity: 0, avgCost: 0, invested: 0, negativeAt: null });
  });
});

describe('holdingsAtDate', () => {
  const history = [
    { date: '2026-09-01', type: 'buy' as const, quantity: 10, price: 4 },
    { date: '2026-09-05', type: 'sell' as const, quantity: 4, price: 6 },
    { date: '2026-09-10', type: 'buy' as const, quantity: 2, price: 5 },
  ];

  it('sums buys minus sells up to the given date', () => {
    expect(holdingsAtDate(history, '2026-09-01')).toBe(10);
    expect(holdingsAtDate(history, '2026-09-05')).toBe(6);
    expect(holdingsAtDate(history, '2026-09-10')).toBe(8);
  });

  it('returns zero before the first trade', () => {
    expect(holdingsAtDate(history, '2026-08-31')).toBe(0);
  });
});
