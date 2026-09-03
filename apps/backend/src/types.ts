export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  currency: string;
  market: string | null;
  isin: string | null;
  kind: 'stock' | 'etf';
}

export interface QuoteResult {
  symbol: string;
  price: number;
  currency: string;
  variationPct: number | null;
  timestamp: string;
}

export interface QuoteError {
  symbol: string;
  message: string;
}
