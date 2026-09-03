/**
 * Market data backend client.
 *
 * The backend is stateless and market-only (US-009). This client only needs
 * the configured URL + API key for health checks, instrument search (US-010)
 * and quotes (US-011). It never sends personal data.
 */

import type { SqlExecutor } from '@/db/client';
import { getBackendSettings, type BackendSettings } from '@/db/repositories/settings-repo';

export class BackendNotConfiguredError extends Error {
  constructor() {
    super('Backend not configured');
    this.name = 'BackendNotConfiguredError';
  }
}

export class BackendUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendUnreachableError';
  }
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  currency: string;
  market: string | null;
  isin: string | null;
  kind: 'stock' | 'etf';
}

export interface Quote {
  symbol: string;
  price: number;
  currency: string;
  variationPct: number | null;
  timestamp: string | null;
}

export interface QuoteError {
  symbol: string;
  message: string;
}

export interface FetchQuotesResult {
  quotes: Quote[];
  errors: QuoteError[];
}

const HEALTH_PATH = '/health';
const SEARCH_PATH = '/search';
const QUOTE_PATH = '/quote';
const MAX_QUOTE_SYMBOLS = 20;
const REQUEST_TIMEOUT_MS = 8000;

export function isValidBackendUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Shared request pipeline: resolves settings, validates them, and performs
 * the fetch with a timeout. Throws typed errors; callers decide how to
 * surface them (result object for connection tests, thrown for searches).
 */
async function requestBackend(
  db: SqlExecutor,
  path: string,
  fetchImpl: typeof fetch,
  settingsOverride?: BackendSettings,
): Promise<Response> {
  const settings = settingsOverride ?? (await getBackendSettings(db));
  const { backendUrl, apiKey } = settings;

  if (!backendUrl || !apiKey) {
    throw new BackendNotConfiguredError();
  }
  if (!isValidBackendUrl(backendUrl)) {
    throw new BackendUnreachableError('La URL del backend no es válida.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetchImpl(`${backendUrl.replace(/\/$/, '')}${path}`, {
      headers: { 'X-API-Key': apiKey },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new BackendUnreachableError('Tiempo de espera agotado.');
    }
    throw new BackendUnreachableError('No se pudo conectar con el backend.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function testConnection(
  db: SqlExecutor,
  fetchImpl: typeof fetch = fetch,
  settingsOverride?: BackendSettings,
): Promise<ConnectionTestResult> {
  let response: Response;
  try {
    response = await requestBackend(db, HEALTH_PATH, fetchImpl, settingsOverride);
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return { ok: false, message: 'Configura la URL y la API key del backend.' };
    }
    if (error instanceof BackendUnreachableError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: 'No se pudo conectar con el backend.' };
  }
  if (response.ok) {
    return { ok: true, message: 'Conexión correcta.' };
  }
  if (response.status === 401) {
    return { ok: false, message: 'API key rechazada (401).' };
  }
  return { ok: false, message: `El backend respondió con estado ${response.status}.` };
}

function normalizeSearchResult(item: unknown): InstrumentSearchResult | null {
  if (typeof item !== 'object' || item === null) {
    return null;
  }
  const candidate = item as Record<string, unknown>;
  if (typeof candidate.symbol !== 'string' || candidate.symbol.trim() === '') {
    return null;
  }
  const symbol = candidate.symbol.trim();
  const name =
    typeof candidate.name === 'string' && candidate.name.trim() !== ''
      ? candidate.name.trim()
      : symbol;
  const currency =
    typeof candidate.currency === 'string' && candidate.currency.trim() !== ''
      ? candidate.currency.trim().toUpperCase()
      : 'EUR';
  return {
    symbol,
    name,
    currency,
    market: typeof candidate.market === 'string' ? candidate.market : null,
    isin: typeof candidate.isin === 'string' ? candidate.isin : null,
    kind: candidate.kind === 'etf' ? 'etf' : 'stock',
  };
}

/**
 * Searches instruments through the backend (`GET /search?q=`). Only the
 * query text leaves the device. Throws BackendNotConfiguredError when the
 * backend is not set up and BackendUnreachableError otherwise.
 */
export async function searchInstruments(
  db: SqlExecutor,
  query: string,
  fetchImpl: typeof fetch = fetch,
  settingsOverride?: BackendSettings,
): Promise<InstrumentSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed === '') {
    return [];
  }
  const response = await requestBackend(
    db,
    `${SEARCH_PATH}?q=${encodeURIComponent(trimmed)}`,
    fetchImpl,
    settingsOverride,
  );
  if (response.status === 401) {
    throw new BackendUnreachableError('API key rechazada (401).');
  }
  if (!response.ok) {
    throw new BackendUnreachableError(`El backend respondió con estado ${response.status}.`);
  }
  const payload = (await response.json()) as { results?: unknown };
  if (!Array.isArray(payload?.results)) {
    throw new BackendUnreachableError('La respuesta del backend no es válida.');
  }
  const results: InstrumentSearchResult[] = [];
  for (const item of payload.results) {
    const normalized = normalizeSearchResult(item);
    if (normalized) {
      results.push(normalized);
    }
  }
  return results;
}

function normalizeQuote(item: unknown): Quote | null {
  if (typeof item !== 'object' || item === null) {
    return null;
  }
  const candidate = item as Record<string, unknown>;
  if (typeof candidate.symbol !== 'string' || candidate.symbol.trim() === '') {
    return null;
  }
  if (typeof candidate.price !== 'number' || !Number.isFinite(candidate.price)) {
    return null;
  }
  return {
    symbol: candidate.symbol.trim(),
    price: candidate.price,
    currency:
      typeof candidate.currency === 'string' && candidate.currency.trim() !== ''
        ? candidate.currency.trim().toUpperCase()
        : 'EUR',
    variationPct: typeof candidate.variationPct === 'number' ? candidate.variationPct : null,
    timestamp: typeof candidate.timestamp === 'string' && candidate.timestamp !== '' ? candidate.timestamp : null,
  };
}

function normalizeQuoteError(item: unknown): QuoteError | null {
  if (typeof item !== 'object' || item === null) {
    return null;
  }
  const candidate = item as Record<string, unknown>;
  if (typeof candidate.symbol !== 'string' || candidate.symbol.trim() === '') {
    return null;
  }
  return {
    symbol: candidate.symbol.trim(),
    message: typeof candidate.message === 'string' ? candidate.message : 'Quote failed',
  };
}

/**
 * Fetches latest quotes through the backend (`GET /quote?symbols=`). Only
 * the symbol list leaves the device. Symbols are sent in batches of at most
 * 20 (backend limit); per-symbol failures come back in `errors` while the
 * rest resolve normally. Throws BackendNotConfiguredError when the backend
 * is not set up and BackendUnreachableError otherwise.
 */
export async function fetchQuotes(
  db: SqlExecutor,
  symbols: string[],
  fetchImpl: typeof fetch = fetch,
  settingsOverride?: BackendSettings,
): Promise<FetchQuotesResult> {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const symbol of symbols) {
    const trimmed = symbol.trim();
    if (trimmed === '' || seen.has(trimmed.toUpperCase())) {
      continue;
    }
    seen.add(trimmed.toUpperCase());
    deduped.push(trimmed);
  }
  if (deduped.length === 0) {
    return { quotes: [], errors: [] };
  }

  const quotes: Quote[] = [];
  const errors: QuoteError[] = [];
  for (let offset = 0; offset < deduped.length; offset += MAX_QUOTE_SYMBOLS) {
    const batch = deduped.slice(offset, offset + MAX_QUOTE_SYMBOLS);
    const path = `${QUOTE_PATH}?symbols=${batch.map((s) => encodeURIComponent(s)).join(',')}`;
    const response = await requestBackend(db, path, fetchImpl, settingsOverride);
    if (response.status === 401) {
      throw new BackendUnreachableError('API key rechazada (401).');
    }
    if (!response.ok) {
      throw new BackendUnreachableError(`El backend respondió con estado ${response.status}.`);
    }
    const payload = (await response.json()) as { quotes?: unknown; errors?: unknown };
    if (!Array.isArray(payload?.quotes)) {
      throw new BackendUnreachableError('La respuesta del backend no es válida.');
    }
    for (const item of payload.quotes) {
      const normalized = normalizeQuote(item);
      if (normalized) {
        quotes.push(normalized);
      }
    }
    if (Array.isArray(payload?.errors)) {
      for (const item of payload.errors) {
        const normalized = normalizeQuoteError(item);
        if (normalized) {
          errors.push(normalized);
        }
      }
    }
  }
  return { quotes, errors };
}