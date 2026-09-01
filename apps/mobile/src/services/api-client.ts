/**
 * Market data backend client.
 *
 * The backend is stateless and market-only (US-009). This client only needs
 * the configured URL + API key and a health check for now. It never sends
 * personal data.
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

const HEALTH_PATH = '/health';
const REQUEST_TIMEOUT_MS = 8000;

export function isValidBackendUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function testConnection(
  db: SqlExecutor,
  fetchImpl: typeof fetch = fetch,
  settingsOverride?: BackendSettings,
): Promise<ConnectionTestResult> {
  const settings = settingsOverride ?? (await getBackendSettings(db));
  const { backendUrl, apiKey } = settings;

  if (!backendUrl || !apiKey) {
    return { ok: false, message: 'Configura la URL y la API key del backend.' };
  }
  if (!isValidBackendUrl(backendUrl)) {
    return { ok: false, message: 'La URL del backend no es válida.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${backendUrl.replace(/\/$/, '')}${HEALTH_PATH}`, {
      headers: { 'X-API-Key': apiKey },
      signal: controller.signal,
    });
    if (response.ok) {
      return { ok: true, message: 'Conexión correcta.' };
    }
    if (response.status === 401) {
      return { ok: false, message: 'API key rechazada (401).' };
    }
    return { ok: false, message: `El backend respondió con estado ${response.status}.` };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado.' };
    }
    return { ok: false, message: 'No se pudo conectar con el backend.' };
  } finally {
    clearTimeout(timeout);
  }
}