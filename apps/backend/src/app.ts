import cors from 'cors';
import express from 'express';
import type { AppConfig } from './config';
import { TtlCache } from './lib/cache';
import { createApiKeyMiddleware } from './middleware/api-key';
import { createHealthRouter } from './routes/health';
import { createQuoteRouter } from './routes/quote';
import { createSearchRouter } from './routes/search';
import type { InstrumentSearchResult, QuoteResult } from './types';
import type { FetchImpl } from './providers/yahoo';

export interface CreateAppOptions {
  config: AppConfig;
  fetchImpl?: FetchImpl;
}

export function createApp(options: CreateAppOptions): express.Express {
  const { config } = options;
  const fetchImpl: FetchImpl = options.fetchImpl ?? fetch;

  const searchCache = new TtlCache<InstrumentSearchResult[]>(config.cacheTtlMs);
  const quoteCache = new TtlCache<QuoteResult>(config.cacheTtlMs);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use(createHealthRouter());

  const apiKeyMiddleware = createApiKeyMiddleware(config.apiKey);
  app.use('/search', apiKeyMiddleware);
  app.use('/quote', apiKeyMiddleware);

  app.use(createSearchRouter({ fetchImpl, cache: searchCache }));
  app.use(createQuoteRouter({ fetchImpl, cache: quoteCache }));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    void err;
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
