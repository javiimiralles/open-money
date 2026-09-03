/**
 * Market data backend client.
 *
 * The backend is stateless and market-only (US-009). This client only needs
 * the configured URL + API key for health checks and instrument search
 * (US-010). It never sends personal data.
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

const HEALTH_PATH = '/health';
const SEARCH_PATH = '/search';
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