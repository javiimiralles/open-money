export interface AppConfig {
  port: number;
  apiKey: string;
  cacheTtlMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const apiKey = env.API_KEY?.trim();
  if (!apiKey) {
    throw new Error('API_KEY is required');
  }

  const portRaw = env.PORT?.trim();
  const port = portRaw ? Number(portRaw) : 3000;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }

  const ttlRaw = env.CACHE_TTL_MS?.trim();
  const cacheTtlMs = ttlRaw ? Number(ttlRaw) : 300000;
  if (!Number.isFinite(cacheTtlMs) || cacheTtlMs <= 0) {
    throw new Error(`Invalid CACHE_TTL_MS: ${env.CACHE_TTL_MS}`);
  }

  return { port, apiKey, cacheTtlMs };
}
