import { migrate } from '@/db/client';
import { saveBackendSettings } from '@/db/repositories/settings-repo';
import {
  BackendNotConfiguredError,
  BackendUnreachableError,
  isValidBackendUrl,
  searchInstruments,
  testConnection,
} from '@/services/api-client';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

describe('isValidBackendUrl', () => {
  it('accepts http and https urls', () => {
    expect(isValidBackendUrl('https://api.example.com')).toBe(true);
    expect(isValidBackendUrl('http://localhost:3000')).toBe(true);
  });

  it('rejects invalid urls', () => {
    expect(isValidBackendUrl('')).toBe(false);
    expect(isValidBackendUrl('not-a-url')).toBe(false);
    expect(isValidBackendUrl('ftp://example.com')).toBe(false);
  });
});

describe('testConnection', () => {
  async function createDbWithSettings(backendUrl: string, apiKey: string) {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    await saveBackendSettings(db, { backendUrl, apiKey });
    return db;
  }

  it('fails with a clear message when backend is not configured', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    const result = await testConnection(db, jest.fn() as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Configura');
    db.close();
  });

  it('fails when the url is invalid', async () => {
    const db = await createDbWithSettings('invalid-url', 'key');
    const result = await testConnection(db, jest.fn() as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('no es válida');
    db.close();
  });

  it('returns ok when the health endpoint responds 200', async () => {
    const db = await createDbWithSettings('https://api.example.com', 'secret');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const result = await testConnection(db, fetchMock as unknown as typeof fetch);

    expect(result).toEqual({ ok: true, message: 'Conexión correcta.' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({ headers: { 'X-API-Key': 'secret' } }),
    );
    db.close();
  });

  it('reports 401 as a rejected API key', async () => {
    const db = await createDbWithSettings('https://api.example.com', 'wrong-key');
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const result = await testConnection(db, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('401');
    db.close();
  });

  it('reports other status codes', async () => {
    const db = await createDbWithSettings('https://api.example.com', 'key');
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    const result = await testConnection(db, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('500');
    db.close();
  });

  it('reports network failures gracefully', async () => {
    const db = await createDbWithSettings('https://api.example.com', 'key');
    const fetchMock = jest.fn().mockRejectedValue(new Error('Network request failed'));
    const result = await testConnection(db, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('No se pudo conectar');
    db.close();
  });

  it('reports a timeout when the request is aborted', async () => {
    const db = await createDbWithSettings('https://api.example.com', 'key');
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    const fetchMock = jest.fn().mockRejectedValue(abortError);
    const result = await testConnection(db, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Tiempo de espera');
    db.close();
  });

  it('uses the provided settings override instead of saved settings', async () => {
    const db = await createDbWithSettings('https://saved.example.com', 'saved-key');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const result = await testConnection(
      db,
      fetchMock as unknown as typeof fetch,
      { backendUrl: 'https://typed.example.com', apiKey: 'typed-key' },
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://typed.example.com/health',
      expect.objectContaining({ headers: { 'X-API-Key': 'typed-key' } }),
    );
    db.close();
  });
});

describe('searchInstruments', () => {
  async function createDbWithSettings(backendUrl: string, apiKey: string) {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    await saveBackendSettings(db, { backendUrl, apiKey });
    return db;
  }

  it('returns an empty list for a blank query without calling the backend', async () => {
    const db = await createDbWithSettings('https://api.example.com', 'secret');
    const fetchMock = jest.fn();
    const results = await searchInstruments(db, '   ', fetchMock as unknown as typeof fetch);
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    db.close();
  });

  it('throws BackendNotConfiguredError when the backend is not configured', async () => {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    await expect(
      searchInstruments(db, 'santander', jest.fn() as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(BackendNotConfiguredError);
    db.close();
  });

  it('calls /search with the encoded query and returns normalized results', async () => {
    const db = await createDbWithSettings('https://api.example.com/', 'secret');
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { symbol: 'SAN.MC', name: 'Banco Santander', currency: 'eur', market: 'BME', isin: null, kind: 'stock' },
          { symbol: '  ', name: 'Sin símbolo' },
        ],
      }),
    });

    const results = await searchInstruments(db, 'santa nder', fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/search?q=santa%20nder',
      expect.objectContaining({ headers: { 'X-API-Key': 'secret' } }),
    );
    expect(results).toEqual([
      { symbol: 'SAN.MC', name: 'Banco Santander', currency: 'EUR', market: 'BME', isin: null, kind: 'stock' },
    ]);
    db.close();
  });

  it('throws BackendUnreachableError on 401', async () => {
    const db = await createDbWithSettings('https://api.example.com', 'wrong-key');
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(
      searchInstruments(db, 'apple', fetchMock as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(BackendUnreachableError);
    db.close();
  });

  it('throws BackendUnreachableError on server errors and network failures', async () => {
    const db = await createDbWithSettings('https://api.example.com', 'key');
    const failingFetch = jest.fn().mockResolvedValue({ ok: false, status: 502 });
    await expect(
      searchInstruments(db, 'apple', failingFetch as unknown as typeof fetch),
    ).rejects.toThrow('502');

    const networkFetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
    await expect(
      searchInstruments(db, 'apple', networkFetch as unknown as typeof fetch),
    ).rejects.toThrow('No se pudo conectar');
    db.close();
  });

  it('throws BackendUnreachableError on an invalid payload', async () => {
    const db = await createDbWithSettings('https://api.example.com', 'key');
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: null }),
    });
    await expect(
      searchInstruments(db, 'apple', fetchMock as unknown as typeof fetch),
    ).rejects.toThrow('no es válida');
    db.close();
  });
});