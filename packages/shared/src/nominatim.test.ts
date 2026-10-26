import { describe, expect, it, vi } from 'vitest';
import { geocode } from './nominatim';

describe('geocode', () => {
  it('returns the first match as a position', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify([{ lat: '42.69', lon: '23.32', display_name: 'Sofia, Bulgaria' }]),
        ),
      );

    const place = await geocode('  Sofia ', { url: 'https://geo.test/search', fetchFn });

    expect(place).toEqual({ label: 'Sofia, Bulgaria', position: { lat: 42.69, lng: 23.32 } });
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://geo.test/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'Sofia',
      format: 'jsonv2',
      limit: '1',
    });
  });

  it('returns null when nothing matches', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('[]'));
    expect(await geocode('zzzz', { fetchFn })).toBeNull();
  });

  it('throws when the service fails', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    await expect(geocode('Sofia', { fetchFn })).rejects.toThrow('HTTP 503');
  });
});
