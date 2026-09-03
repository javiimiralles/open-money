import { TtlCache } from '../lib/cache';

describe('TtlCache', () => {
  it('stores and retrieves values', () => {
    const cache = new TtlCache<string>(10000);
    cache.set('a', 'hello');
    expect(cache.get('a')).toBe('hello');
  });

  it('returns undefined for missing keys', () => {
    const cache = new TtlCache<string>(10000);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires entries after TTL', async () => {
    const cache = new TtlCache<string>(10);
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    await new Promise((r) => setTimeout(r, 20));
    expect(cache.get('k')).toBeUndefined();
  });

  it('reports size excluding expired entries', async () => {
    const cache = new TtlCache<string>(10);
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size).toBe(2);
    await new Promise((r) => setTimeout(r, 20));
    expect(cache.size).toBe(0);
  });

  it('clear removes all entries', () => {
    const cache = new TtlCache<string>(10000);
    cache.set('a', '1');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });
});
