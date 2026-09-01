import { migrate } from '@/db/client';
import {
  getBackendSettings,
  getSetting,
  saveBackendSettings,
  SETTINGS_KEYS,
  setSetting,
} from '@/db/repositories/settings-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

describe('settings-repo', () => {
  async function createDb() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    return db;
  }

  it('returns empty settings when nothing is stored', async () => {
    const db = await createDb();
    const settings = await getBackendSettings(db);
    expect(settings).toEqual({ backendUrl: '', apiKey: '' });
    db.close();
  });

  it('saves and reads backend settings', async () => {
    const db = await createDb();
    await saveBackendSettings(db, { backendUrl: 'https://api.example.com', apiKey: 'secret-key' });

    const settings = await getBackendSettings(db);
    expect(settings).toEqual({ backendUrl: 'https://api.example.com', apiKey: 'secret-key' });
    db.close();
  });

  it('upserts on conflict instead of duplicating rows', async () => {
    const db = await createDb();
    await setSetting(db, SETTINGS_KEYS.apiKey, 'first');
    await setSetting(db, SETTINGS_KEYS.apiKey, 'second');

    expect(await getSetting(db, SETTINGS_KEYS.apiKey)).toBe('second');
    const count = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM settings WHERE key = ?',
      [SETTINGS_KEYS.apiKey],
    );
    expect(count?.count).toBe(1);
    db.close();
  });

  it('stores special characters in values safely', async () => {
    const db = await createDb();
    const tricky = "it's an 'apostrophe' key";
    await setSetting(db, SETTINGS_KEYS.apiKey, tricky);
    expect(await getSetting(db, SETTINGS_KEYS.apiKey)).toBe(tricky);
    db.close();
  });
});