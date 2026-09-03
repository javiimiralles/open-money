import type { InstrumentSearchResult, QuoteResult } from '../types';

const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export type FetchImpl = typeof fetch;

interface YahooSearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  currency?: string;
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
}

interface YahooChartMeta {
  currency?: string;
  symbol?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketTime?: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{ meta?: YahooChartMeta }>;
    error?: { code?: string; description?: string } | null;
  };
}

function mapKind(quoteType?: string): 'stock' | 'etf' {
  if (quoteType === 'ETF') return 'etf';
  return 'stock';
}

export async function searchYahoo(
  query: string,
  fetchImpl: FetchImpl = fetch,
): Promise<InstrumentSearchResult[]> {
  const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`;
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'open-money-backend/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Yahoo search failed with status ${response.status}`);
  }

  const data = (await response.json()) as YahooSearchResponse;
  const quotes = data.quotes ?? [];

  const results: InstrumentSearchResult[] = [];
  const seen = new Set<string>();

  for (const q of quotes) {
    if (!q.symbol) continue;
    const symbol = q.symbol.trim();
    if (!symbol || seen.has(symbol.toUpperCase())) continue;
    // Only stocks and ETFs; ignore other quote types like FUTURE, INDEX, etc.
    // Keep EQUITY, ETF — map others to stock conservatively but filter obvious non-tradables.
    if (q.quoteType && !['EQUITY', 'ETF'].includes(q.quoteType)) continue;

    seen.add(symbol.toUpperCase());
    results.push({
      symbol,
      name: (q.longname ?? q.shortname ?? symbol).trim(),
      currency: (q.currency ?? 'USD').trim().toUpperCase(),
      market: q.exchange?.trim() ?? null,
      isin: null,
      kind: mapKind(q.quoteType),
    });
  }

  return results;
}

export async function fetchYahooQuote(
  symbol: string,
  fetchImpl: FetchImpl = fetch,
): Promise<QuoteResult> {
  const encoded = encodeURIComponent(symbol);
  const url = `${YAHOO_CHART_URL}/${encoded}?interval=1d&range=1d`;
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'open-money-backend/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Yahoo quote failed for ${symbol} with status ${response.status}`);
  }

  const data = (await response.json()) as YahooChartResponse;
  const chartError = data.chart?.error;
  if (chartError) {
    throw new Error(chartError.description ?? chartError.code ?? `Yahoo chart error for ${symbol}`);
  }

  const meta = data.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    throw new Error(`No price data for ${symbol}`);
  }

  const price = meta.regularMarketPrice;
  const currency = (meta.currency ?? 'USD').toUpperCase();
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const variationPct =
    previousClose !== null && previousClose !== 0 ? ((price - previousClose) / previousClose) * 100 : null;
  const timestampRaw = meta.regularMarketTime;
  const timestamp =
    typeof timestampRaw === 'number' ? new Date(timestampRaw * 1000).toISOString() : new Date().toISOString();

  return {
    symbol,
    price,
    currency,
    variationPct,
    timestamp,
  };
}
