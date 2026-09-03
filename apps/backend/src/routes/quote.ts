import { Router } from 'express';
import type { FetchImpl } from '../providers/yahoo';
import { fetchYahooQuote } from '../providers/yahoo';
import type { TtlCache } from '../lib/cache';
import type { QuoteError, QuoteResult } from '../types';

export interface QuoteRouterDeps {
  fetchImpl: FetchImpl;
  cache: TtlCache<QuoteResult>;
}

const MAX_SYMBOLS = 20;

export function createQuoteRouter(deps: QuoteRouterDeps): Router {
  const router = Router();

  router.get('/quote', async (req, res) => {
    const raw = req.query.symbols;
    const symbolsParam = typeof raw === 'string' ? raw : '';

    if (!symbolsParam.trim()) {
      res.status(400).json({ error: 'Missing query parameter "symbols"' });
      return;
    }

    const symbols = symbolsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (symbols.length === 0) {
      res.status(400).json({ error: 'Missing query parameter "symbols"' });
      return;
    }

    if (symbols.length > MAX_SYMBOLS) {
      res.status(400).json({ error: `Too many symbols (max ${MAX_SYMBOLS})` });
      return;
    }

    // Deduplicate case-insensitively, keep first occurrence casing
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const s of symbols) {
      const key = s.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(s);
      }
    }

    const quotes: QuoteResult[] = [];
    const errors: QuoteError[] = [];

    await Promise.all(
      deduped.map(async (symbol) => {
        const cacheKey = symbol.toUpperCase();
        const cached = deps.cache.get(cacheKey);
        if (cached) {
          quotes.push(cached);
          return;
        }
        try {
          const result = await fetchYahooQuote(symbol, deps.fetchImpl);
          deps.cache.set(cacheKey, result);
          quotes.push(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Quote failed';
          errors.push({ symbol, message });
        }
      }),
    );

    // Preserve original request order
    const order = new Map(deduped.map((s, i) => [s.toUpperCase(), i]));
    quotes.sort((a, b) => (order.get(a.symbol.toUpperCase()) ?? 0) - (order.get(b.symbol.toUpperCase()) ?? 0));
    errors.sort((a, b) => (order.get(a.symbol.toUpperCase()) ?? 0) - (order.get(b.symbol.toUpperCase()) ?? 0));

    res.json({ quotes, errors });
  });

  return router;
}
