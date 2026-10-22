import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCafeQuery, fetchNearbyCafes, parseCafes, type OverpassResponse } from './overpass';

const origin = { lat: 60.1699, lng: 24.9384 };

const sample: OverpassResponse = {
  elements: [
    {
      type: 'node',
      id: 1,
      lat: 60.18,
      lon: 24.94,
      tags: { name: 'Far Café', amenity: 'cafe' },
    },
    {
      type: 'node',
      id: 2,
      lat: 60.1701,
      lon: 24.9386,
      tags: {
        name: '  Near Café ',
        'addr:street': 'Mannerheimintie',
        'addr:housenumber': '5',
        'addr:city': 'Helsinki',
        opening_hours: 'Mo-Fr 07:00-18:00',
        'contact:website': 'https://near.example',
      },
    },
    { type: 'way', id: 3, center: { lat: 60.172, lon: 24.94 }, tags: { name: 'Building Café' } },
    { type: 'node', id: 4, lat: 60.17, lon: 24.94, tags: { amenity: 'cafe' } },
    { type: 'way', id: 5, tags: { name: 'No Coordinates' } },
  ],
};

describe('buildCafeQuery', () => {
  it('asks for cafe nodes and ways around the origin', () => {
    const query = buildCafeQuery(origin, 1499.6);
    expect(query).toContain('node["amenity"="cafe"](around:1500,60.1699,24.9384)');
    expect(query).toContain('way["amenity"="cafe"](around:1500,60.1699,24.9384)');
    expect(query).toContain('out center tags');
  });
});

describe('parseCafes', () => {
  const cafes = parseCafes(sample, origin);

  it('sorts cafés nearest first', () => {
    expect(cafes.map((c) => c.name)).toEqual(['Near Café', 'Building Café', 'Far Café']);
    expect(cafes[0].distanceM).toBeLessThan(cafes[1].distanceM);
  });

  it('uses the centre point for buildings (ways)', () => {
    expect(cafes[1]).toMatchObject({ id: 'way/3', position: { lat: 60.172, lng: 24.94 } });
  });

  it('skips unnamed cafés and elements without coordinates', () => {
    expect(cafes.find((c) => c.id === 'node/4')).toBeUndefined();
    expect(cafes.find((c) => c.id === 'way/5')).toBeUndefined();
  });

  it('builds address, hours and website from tags', () => {
    expect(cafes[0]).toMatchObject({
      address: 'Mannerheimintie 5, Helsinki',
      openingHours: 'Mo-Fr 07:00-18:00',
      website: 'https://near.example',
    });
    expect(cafes[2].address).toBeUndefined();
  });

  it('caps the result list at 50', () => {
    const many: OverpassResponse = {
      elements: Array.from({ length: 80 }, (_, i) => ({
        type: 'node' as const,
        id: i,
        lat: 60.17 + i * 0.0001,
        lon: 24.94,
        tags: { name: `Café ${i}` },
      })),
    };
    expect(parseCafes(many, origin)).toHaveLength(50);
  });
});

describe('fetchNearbyCafes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs the query and parses the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(sample)));
    vi.stubGlobal('fetch', fetchMock);

    const cafes = await fetchNearbyCafes(origin, 1000);

    expect(cafes).toHaveLength(3);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body.get('data')).toContain('around:1000');
  });

  it('falls back to the next server when one is busy or unreachable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 504 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify(sample)));
    vi.stubGlobal('fetch', fetchMock);

    const cafes = await fetchNearbyCafes(origin, 1000, undefined, ['a', 'b', 'c']);

    expect(cafes).toHaveLength(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['a', 'b', 'c']);
  });

  it('throws a readable error when every server fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('busy', { status: 429 })));
    await expect(fetchNearbyCafes(origin, 1000, undefined, ['a', 'b'])).rejects.toThrow(
      /busy right now \(HTTP 429\)/,
    );
  });

  it('stops trying when the search is cancelled', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchNearbyCafes(origin, 1000, controller.signal, ['a', 'b'])).rejects.toThrow(
      'Aborted',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
