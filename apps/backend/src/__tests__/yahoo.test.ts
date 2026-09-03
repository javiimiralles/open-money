import { fetchYahooQuote, searchYahoo } from '../providers/yahoo';

function mockFetch(json: unknown, ok = true, status = 200): typeof fetch {
  return jest.fn(async () =>
    ({
      ok,
      status,
      json: async () => json,
    }) as Response,
  ) as unknown as typeof fetch;
}

describe('searchYahoo', () => {
  it('maps Yahoo quotes to InstrumentSearchResult', async () => {
    const fetchMock = mockFetch({
      quotes: [
        { symbol: 'VWCE.DE', shortname: 'Vanguard FTSE All-World', longname: 'Vanguard FTSE All-World UCITS ETF', quoteType: 'ETF', exchange: 'GER', currency: 'EUR' },
        { symbol: 'AAPL', shortname: 'Apple Inc.', quoteType: 'EQUITY', exchange: 'NMS', currency: 'USD' },
      ],
    });
    const results = await searchYahoo('vanguard', fetchMock);
    expect(results).toEqual([
      { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World UCITS ETF', currency: 'EUR', market: 'GER', isin: null, kind: 'etf' },
      { symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD', market: 'NMS', isin: null, kind: 'stock' },
    ]);
  });

  it('deduplicates by symbol and ignores non-equity types', async () => {
    const fetchMock = mockFetch({
      quotes: [
        { symbol: 'AAPL', shortname: 'Apple', quoteType: 'EQUITY', currency: 'USD' },
        { symbol: 'AAPL', shortname: 'Apple dup', quoteType: 'EQUITY', currency: 'USD' },
        { symbol: 'ES=F', shortname: 'S&P Future', quoteType: 'FUTURE', currency: 'USD' },
      ],
    });
    const results = await searchYahoo('aapl', fetchMock);
    expect(results).toHaveLength(1);
    expect(results[0].symbol).toBe('AAPL');
  });

  it('throws on non-ok response', async () => {
    const fetchMock = mockFetch({}, false, 500);
    await expect(searchYahoo('test', fetchMock)).rejects.toThrow('Yahoo search failed');
  });

  it('returns empty array when no quotes', async () => {
    const fetchMock = mockFetch({ quotes: [] });
    const results = await searchYahoo('isin-test', fetchMock);
    expect(results).toEqual([]);
  });
});

describe('fetchYahooQuote', () => {
  it('returns price, currency, variation and timestamp', async () => {
    const fetchMock = mockFetch({
      chart: {
        result: [
          {
            meta: {
              currency: 'USD',
              symbol: 'AAPL',
              regularMarketPrice: 200,
              chartPreviousClose: 190,
              regularMarketTime: 1725340800,
            },
          },
        ],
        error: null,
      },
    });
    const result = await fetchYahooQuote('AAPL', fetchMock);
    expect(result.symbol).toBe('AAPL');
    expect(result.price).toBe(200);
    expect(result.currency).toBe('USD');
    expect(result.variationPct).toBeCloseTo(((200 - 190) / 190) * 100);
    expect(result.timestamp).toBe(new Date(1725340800 * 1000).toISOString());
  });

  it('returns null variation when previous close is missing', async () => {
    const fetchMock = mockFetch({
      chart: { result: [{ meta: { currency: 'EUR', regularMarketPrice: 50, regularMarketTime: 1725340800 } }], error: null },
    });
    const result = await fetchYahooQuote('VWCE.DE', fetchMock);
    expect(result.variationPct).toBeNull();
  });

  it('throws when chart error is present', async () => {
    const fetchMock = mockFetch({
      chart: { result: null, error: { description: 'Not Found' } },
    });
    await expect(fetchYahooQuote('BAD', fetchMock)).rejects.toThrow('Not Found');
  });

  it('throws when price is missing', async () => {
    const fetchMock = mockFetch({
      chart: { result: [{ meta: { currency: 'USD' } }], error: null },
    });
    await expect(fetchYahooQuote('AAPL', fetchMock)).rejects.toThrow('No price data');
  });

  it('throws on non-ok response', async () => {
    const fetchMock = mockFetch({}, false, 502);
    await expect(fetchYahooQuote('AAPL', fetchMock)).rejects.toThrow('Yahoo quote failed');
  });
});
