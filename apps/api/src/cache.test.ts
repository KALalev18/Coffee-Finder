import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from './cache';

describe('TtlCache', () => {
  it('loads once and then serves hits until the entry expires', async () => {
    let now = 0;
    const cache = new TtlCache<string>(1000, 10, () => now);
    const load = vi.fn().mockResolvedValue('value');

    expect(await cache.getOrLoad('k', load)).toEqual({ value: 'value', hit: false });
    now = 999;
    expect(await cache.getOrLoad('k', load)).toEqual({ value: 'value', hit: true });
    now = 1000;
    expect(await cache.getOrLoad('k', load)).toEqual({ value: 'value', hit: false });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares one upstream call between concurrent requests', async () => {
    const cache = new TtlCache<string>(1000, 10);
    let resolve!: (v: string) => void;
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const first = cache.getOrLoad('k', load);
    const second = cache.getOrLoad('k', load);
    resolve('value');

    expect(await first).toEqual({ value: 'value', hit: false });
    expect(await second).toEqual({ value: 'value', hit: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const cache = new TtlCache<string>(1000, 10);
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('ok');

    await expect(cache.getOrLoad('k', load)).rejects.toThrow('down');
    expect(await cache.getOrLoad('k', load)).toEqual({ value: 'ok', hit: false });
  });

  it('evicts the least recently used entry when full', async () => {
    const cache = new TtlCache<string>(1000, 2);
    const load = (v: string) => () => Promise.resolve(v);

    await cache.getOrLoad('a', load('a'));
    await cache.getOrLoad('b', load('b'));
    await cache.getOrLoad('a', load('a')); // "a" is now the most recent
    await cache.getOrLoad('c', load('c')); // evicts "b"

    expect(cache.size).toBe(2);
    expect((await cache.getOrLoad('a', load('a'))).hit).toBe(true);
    expect((await cache.getOrLoad('b', load('b'))).hit).toBe(false);
  });
});
