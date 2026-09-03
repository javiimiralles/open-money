import { loadConfig } from '../config';

describe('loadConfig', () => {
  it('loads defaults when optional vars are missing', () => {
    const config = loadConfig({ API_KEY: 'secret' });
    expect(config).toEqual({ port: 3000, apiKey: 'secret', cacheTtlMs: 300000 });
  });

  it('parses custom port and TTL', () => {
    const config = loadConfig({ API_KEY: 'k', PORT: '8080', CACHE_TTL_MS: '60000' });
    expect(config.port).toBe(8080);
    expect(config.cacheTtlMs).toBe(60000);
  });

  it('trims API_KEY', () => {
    const config = loadConfig({ API_KEY: '  spaced  ' });
    expect(config.apiKey).toBe('spaced');
  });

  it('throws when API_KEY is missing', () => {
    expect(() => loadConfig({})).toThrow('API_KEY is required');
    expect(() => loadConfig({ API_KEY: '  ' })).toThrow('API_KEY is required');
  });

  it('throws on invalid PORT', () => {
    expect(() => loadConfig({ API_KEY: 'k', PORT: 'abc' })).toThrow('Invalid PORT');
    expect(() => loadConfig({ API_KEY: 'k', PORT: '0' })).toThrow('Invalid PORT');
  });

  it('throws on invalid CACHE_TTL_MS', () => {
    expect(() => loadConfig({ API_KEY: 'k', CACHE_TTL_MS: '0' })).toThrow('Invalid CACHE_TTL_MS');
    expect(() => loadConfig({ API_KEY: 'k', CACHE_TTL_MS: 'nope' })).toThrow('Invalid CACHE_TTL_MS');
  });
});
