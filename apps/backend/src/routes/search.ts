import { Router } from 'express';
import type { FetchImpl } from '../providers/yahoo';
import { searchYahoo } from '../providers/yahoo';
import type { TtlCache } from '../lib/cache';
import type { InstrumentSearchResult } from '../types';

export interface SearchRouterDeps {
  fetchImpl: FetchImpl;
  cache: TtlCache<InstrumentSearchResult[]>;
}

export function createSearchRouter(deps: SearchRouterDeps): Router {
  const router = Router();

  router.get('/search', async (req, res) => {
    const rawQ = req.query.q;
    const q = typeof rawQ === 'string' ? rawQ.trim() : '';

    if (!q) {
      res.status(400).json({ error: 'Missing query parameter "q"' });
      return;
    }

    const cacheKey = q.toLowerCase();
    const cached = deps.cache.get(cacheKey);
    if (cached) {
      res.json({ results: cached });
      return;
    }

    try {
      const results = await searchYahoo(q, deps.fetchImpl);
      deps.cache.set(cacheKey, results);
      res.json({ results });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      res.status(502).json({ error: message });
    }
  });

  return router;
}
