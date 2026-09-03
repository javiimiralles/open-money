import request from 'supertest';
import express from 'express';
import { TtlCache } from '../lib/cache';
import { createSearchRouter } from '../routes/search';
import type { InstrumentSearchResult } from '../types';

function createApp(fetchImpl: typeof fetch, cache = new TtlCache<InstrumentSearchResult[]>(300000)) {
  const app = express();
  app.use(createSearchRouter({ fetchImpl, cache }));
  return { app, cache };
}

function yahooSearchMock(quotes: unknown[]): typeof fetch {
  return jest.fn(async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ quotes }),
    }) as Response,
  ) as unknown as typeof fetch;
}

describe('GET /search', () => {
  it('returns 400 when q is missing', async () => {
    const { app } = createApp(yahooSearchMock([]));
    await request(app).get('/search').expect(400);
    await request(app).get('/search?q=').expect(400);
    await request(app).get('/search?q=   ').expect(400);
  });

  it('returns results from Yahoo', async () => {
    const { app } = createApp(
      yahooSearchMock([{ symbol: 'AAPL', shortname: 'Apple', quoteType: 'EQUITY', exchange: 'NMS', currency: 'USD' }]),
    );
    const res = await request(app).get('/search?q=aapl').expect(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].symbol).toBe('AAPL');
  });

  it('caches results by normalized query', async () => {
    const fetchMock = jest.fn(async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ quotes: [{ symbol: 'AAPL', shortname: 'Apple', quoteType: 'EQUITY', currency: 'USD' }] }),
      }) as Response,
    ) as unknown as typeof fetch;
    const { app } = createApp(fetchMock);
    await request(app).get('/search?q=AAPL').expect(200);
    await request(app).get('/search?q=aapl').expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns 502 on upstream failure', async () => {
    const fetchMock = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response) as unknown as typeof fetch;
    const { app } = createApp(fetchMock);
    const res = await request(app).get('/search?q=test').expect(502);
    expect(res.body.error).toBeDefined();
  });
});
