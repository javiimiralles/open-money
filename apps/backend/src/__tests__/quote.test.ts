import request from 'supertest';
import express from 'express';
import { TtlCache } from '../lib/cache';
import { createQuoteRouter } from '../routes/quote';
import type { QuoteResult } from '../types';

function createApp(fetchImpl: typeof fetch, cache = new TtlCache<QuoteResult>(300000)) {
  const app = express();
  app.use(createQuoteRouter({ fetchImpl, cache }));
  return { app, cache };
}

function chartMock(price: number, previousClose = 90, symbol = 'AAPL'): typeof fetch {
  return jest.fn(async (url: string) => {
    // Extract symbol from URL for dynamic response
    const match = String(url).match(/\/chart\/([^?]+)/);
    const sym = match ? decodeURIComponent(match[1]) : symbol;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        chart: {
          result: [{ meta: { currency: 'USD', symbol: sym, regularMarketPrice: price, chartPreviousClose: previousClose, regularMarketTime: 1725340800 } }],
          error: null,
        },
      }),
    } as Response;
  }) as unknown as typeof fetch;
}

describe('GET /quote', () => {
  it('returns 400 when symbols is missing', async () => {
    const { app } = createApp(chartMock(100));
    await request(app).get('/quote').expect(400);
    await request(app).get('/quote?symbols=').expect(400);
    await request(app).get('/quote?symbols=   ').expect(400);
  });

  it('returns quotes for valid symbols', async () => {
    const { app } = createApp(chartMock(100));
    const res = await request(app).get('/quote?symbols=AAPL').expect(200);
    expect(res.body.quotes).toHaveLength(1);
    expect(res.body.quotes[0].symbol).toBe('AAPL');
    expect(res.body.errors).toEqual([]);
  });

  it('handles multiple symbols and preserves order', async () => {
    const { app } = createApp(chartMock(100));
    const res = await request(app).get('/quote?symbols=MSFT,AAPL').expect(200);
    expect(res.body.quotes).toHaveLength(2);
    expect(res.body.quotes[0].symbol).toBe('MSFT');
    expect(res.body.quotes[1].symbol).toBe('AAPL');
  });

  it('deduplicates case-insensitively', async () => {
    const fetchMock = chartMock(100);
    const { app } = createApp(fetchMock);
    const res = await request(app).get('/quote?symbols=AAPL,aapl,AAPL').expect(200);
    expect(res.body.quotes).toHaveLength(1);
    expect((fetchMock as jest.Mock).mock.calls.length).toBe(1);
  });

  it('returns partial errors for failed symbols', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (String(url).includes('BAD')) {
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          chart: { result: [{ meta: { currency: 'USD', symbol: 'AAPL', regularMarketPrice: 100, chartPreviousClose: 90, regularMarketTime: 1725340800 } }], error: null },
        }),
      } as Response;
    }) as unknown as typeof fetch;
    const { app } = createApp(fetchMock);
    const res = await request(app).get('/quote?symbols=AAPL,BAD').expect(200);
    expect(res.body.quotes).toHaveLength(1);
    expect(res.body.quotes[0].symbol).toBe('AAPL');
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].symbol).toBe('BAD');
  });

  it('caches per symbol', async () => {
    const fetchMock = chartMock(100);
    const { app } = createApp(fetchMock);
    await request(app).get('/quote?symbols=AAPL').expect(200);
    await request(app).get('/quote?symbols=AAPL').expect(200);
    expect((fetchMock as jest.Mock).mock.calls.length).toBe(1);
  });

  it('rejects too many symbols', async () => {
    const { app } = createApp(chartMock(100));
    const many = Array.from({ length: 21 }, (_, i) => `SYM${i}`).join(',');
    await request(app).get(`/quote?symbols=${many}`).expect(400);
  });
});
