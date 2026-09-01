import { migrate } from '@/db/client';
import { saveBackendSettings } from '@/db/repositories/settings-repo';
import { isValidBackendUrl, testConnection } from '@/services/api-client';
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