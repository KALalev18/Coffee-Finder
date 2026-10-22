import { afterEach, describe, expect, it, vi } from 'vitest';
import { geocode } from './nominatim';

afterEach(() => vi.unstubAllGlobals());

describe('geocode', () => {
  it('returns the first match as a position', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify([{ lat: '42.69', lon: '23.32', display_name: 'Sofia, Bulgaria' }]),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const place = await geocode('  Sofia ');

    expect(place).toEqual({ label: 'Sofia, Bulgaria', position: { lat: 42.69, lng: 23.32 } });
    expect(fetchMock.mock.calls[0][0]).toContain('q=Sofia&format=jsonv2&limit=1');
  });

  it('returns null when nothing matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]')));
    expect(await geocode('zzzz')).toBeNull();
  });

  it('throws when the service fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(geocode('Sofia')).rejects.toThrow('HTTP 503');
  });
});
