import request from 'supertest';
import { createApp } from '../app';

const API_KEY = 'test-key-123';

function mockFetchForSearch(quotes: unknown[] = []): typeof fetch {
  return jest.fn(async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ quotes }),
    }) as Response,
  ) as unknown as typeof fetch;
}

function mockFetchForQuote(price = 100): typeof fetch {
  return jest.fn(async (url: string) => {
    const match = String(url).match(/\/chart\/([^?]+)/);
    // Search requests contain /search, quote contains /chart
    if (String(url).includes('/v1/finance/search')) {
      return { ok: true, status: 200, json: async () => ({ quotes: [] }) } as Response;
    }
    if (String(url).includes('/chart/BAD')) {
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }
    const sym = match ? decodeURIComponent(match[1]) : 'AAPL';
    return {
      ok: true,
      status: 200,
      json: async () => ({
        chart: { result: [{ meta: { currency: 'USD', symbol: sym, regularMarketPrice: price, chartPreviousClose: 90, regularMarketTime: 1725340800 } }], error: null },
      }),
    } as Response;
  }) as unknown as typeof fetch;
}

describe('app integration', () => {
  it('GET /health is public (no API key required)', async () => {
    const app = createApp({ config: { port: 3000, apiKey: API_KEY, cacheTtlMs: 300000 }, fetchImpl: mockFetchForSearch() });
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health also accepts requests with API key', async () => {
    const app = createApp({ config: { port: 3000, apiKey: API_KEY, cacheTtlMs: 300000 }, fetchImpl: mockFetchForSearch() });
    await request(app).get('/health').set('X-API-Key', API_KEY).expect(200);
  });

  it('GET /search rejects without API key', async () => {
    const app = createApp({ config: { port: 3000, apiKey: API_KEY, cacheTtlMs: 300000 }, fetchImpl: mockFetchForSearch() });
    await request(app).get('/search?q=aapl').expect(401);
  });

  it('GET /search rejects with wrong API key', async () => {
    const app = createApp({ config: { port: 3000, apiKey: API_KEY, cacheTtlMs: 300000 }, fetchImpl: mockFetchForSearch() });
    await request(app).get('/search?q=aapl').set('X-API-Key', 'wrong').expect(401);
  });

  it('GET /search succeeds with correct key', async () => {
    const app = createApp({
      config: { port: 3000, apiKey: API_KEY, cacheTtlMs: 300000 },
      fetchImpl: mockFetchForSearch([{ symbol: 'AAPL', shortname: 'Apple', quoteType: 'EQUITY', currency: 'USD' }]),
    });
    const res = await request(app).get('/search?q=aapl').set('X-API-Key', API_KEY).expect(200);
    expect(res.body.results[0].symbol).toBe('AAPL');
  });

  it('GET /quote rejects without API key', async () => {
    const app = createApp({ config: { port: 3000, apiKey: API_KEY, cacheTtlMs: 300000 }, fetchImpl: mockFetchForQuote() });
    await request(app).get('/quote?symbols=AAPL').expect(401);
  });

  it('GET /quote succeeds with correct key and returns partial errors', async () => {
    const app = createApp({ config: { port: 3000, apiKey: API_KEY, cacheTtlMs: 300000 }, fetchImpl: mockFetchForQuote() });
    const res = await request(app).get('/quote?symbols=AAPL,BAD').set('X-API-Key', API_KEY).expect(200);
    expect(res.body.quotes).toHaveLength(1);
    expect(res.body.errors).toHaveLength(1);
  });

  it('unknown route returns 404', async () => {
    const app = createApp({ config: { port: 3000, apiKey: API_KEY, cacheTtlMs: 300000 }, fetchImpl: mockFetchForSearch() });
    await request(app).get('/unknown').set('X-API-Key', API_KEY).expect(404);
  });

  it('does not cache failed quote responses', async () => {
    let calls = 0;
    const fetchMock = jest.fn(async (url: string) => {
      if (String(url).includes('/search')) {
        return { ok: true, status: 200, json: async () => ({ quotes: [] }) } as Response;
      }
      calls++;
      if (calls === 1) {
        return { ok: false, status: 500, json: async () => ({}) } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          chart: { result: [{ meta: { currency: 'USD', symbol: 'AAPL', regularMarketPrice: 100, chartPreviousClose: 90, regularMarketTime: 1725340800 } }], error: null },
        }),
      } as Response;
    }) as unknown as typeof fetch;

    const app = createApp({ config: { port: 3000, apiKey: API_KEY, cacheTtlMs: 300000 }, fetchImpl: fetchMock });
    const first = await request(app).get('/quote?symbols=AAPL').set('X-API-Key', API_KEY).expect(200);
    expect(first.body.quotes).toHaveLength(0);
    expect(first.body.errors).toHaveLength(1);
    const second = await request(app).get('/quote?symbols=AAPL').set('X-API-Key', API_KEY).expect(200);
    expect(second.body.quotes).toHaveLength(1);
  });
});
