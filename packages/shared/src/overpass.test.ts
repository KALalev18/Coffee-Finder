import { describe, expect, it, vi } from 'vitest';
import {
  buildCafeQuery,
  fetchCafes,
  parseCafes,
  rankByDistance,
  safeWebsite,
  type OverpassResponse,
} from './overpass';

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
  const cafes = parseCafes(sample);
  const byId = (id: string) => cafes.find((c) => c.id === id);

  it('uses the centre point for buildings (ways)', () => {
    expect(byId('way/3')).toMatchObject({ position: { lat: 60.172, lng: 24.94 } });
  });

  it('skips unnamed cafés and elements without coordinates', () => {
    expect(cafes.map((c) => c.id)).toEqual(['node/1', 'node/2', 'way/3']);
  });

  it('builds a trimmed name, address, hours and website from tags', () => {
    expect(byId('node/2')).toMatchObject({
      name: 'Near Café',
      address: 'Mannerheimintie 5, Helsinki',
      openingHours: 'Mo-Fr 07:00-18:00',
      website: 'https://near.example/',
    });
    expect(byId('node/1')?.address).toBeUndefined();
  });
});

describe('rankByDistance', () => {
  const cafes = parseCafes(sample);

  it('sorts cafés nearest first and adds the distance', () => {
    const ranked = rankByDistance(cafes, origin);
    expect(ranked.map((c) => c.name)).toEqual(['Near Café', 'Building Café', 'Far Café']);
    expect(ranked[0].distanceM).toBeLessThan(ranked[1].distanceM);
  });

  it('drops cafés outside the radius', () => {
    expect(rankByDistance(cafes, origin, 500).map((c) => c.name)).toEqual([
      'Near Café',
      'Building Café',
    ]);
  });

  it('caps the result list at 50 by default', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      id: `node/${i}`,
      name: `Café ${i}`,
      position: { lat: 60.17 + i * 0.0001, lng: 24.94 },
    }));
    expect(rankByDistance(many, origin)).toHaveLength(50);
  });
});

describe('safeWebsite', () => {
  it('keeps http(s) links and adds https:// to bare domains', () => {
    expect(safeWebsite('http://cafe.example/menu')).toBe('http://cafe.example/menu');
    expect(safeWebsite(' cafe.example ')).toBe('https://cafe.example/');
  });

  it('drops script and other non-web URLs', () => {
    expect(safeWebsite('javascript:alert(1)')).toBeUndefined();
    expect(safeWebsite('JavaScript:alert(1)')).toBeUndefined();
    expect(safeWebsite('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeWebsite('mailto:hi@cafe.example')).toBeUndefined();
    expect(safeWebsite('')).toBeUndefined();
    expect(safeWebsite(undefined)).toBeUndefined();
  });
});

/** A fake server that never answers; it only rejects when the request is aborted. */
const hang: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) =>
    init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason)),
  );

describe('fetchCafes', () => {
  it('POSTs the query with extra headers and parses the response', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify(sample)));

    const cafes = await fetchCafes(origin, 1000, {
      urls: ['a'],
      headers: { 'User-Agent': 'test' },
      fetchFn,
    });

    expect(cafes).toHaveLength(3);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('a');
    expect(init.method).toBe('POST');
    expect(init.headers['User-Agent']).toBe('test');
    expect(init.body.get('data')).toContain('around:1000');
  });

  it('falls back to the next server when one is busy or unreachable', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 504 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify(sample)));

    const cafes = await fetchCafes(origin, 1000, { urls: ['a', 'b', 'c'], fetchFn });

    expect(cafes).toHaveLength(3);
    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual(['a', 'b', 'c']);
  });

  it('moves on from a server that stops responding', async () => {
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(hang)
      .mockResolvedValueOnce(new Response(JSON.stringify(sample)));

    const cafes = await fetchCafes(origin, 1000, { urls: ['a', 'b'], timeoutMs: 20, fetchFn });

    expect(cafes).toHaveLength(3);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('reports a timeout when every server stalls', async () => {
    const fetchFn = vi.fn(hang);
    await expect(fetchCafes(origin, 1000, { urls: ['a'], timeoutMs: 20, fetchFn })).rejects.toThrow(
      /timed out/,
    );
  });

  it('throws a readable error when every server fails', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('busy', { status: 429 }));
    await expect(fetchCafes(origin, 1000, { urls: ['a', 'b'], fetchFn })).rejects.toThrow(
      /busy right now \(HTTP 429\)/,
    );
  });

  it('stops trying when the search is cancelled', async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    await expect(
      fetchCafes(origin, 1000, { urls: ['a', 'b'], signal: controller.signal, fetchFn }),
    ).rejects.toThrow('Aborted');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('fetchCafes time budget', () => {
  it('stops trying mirrors once the total time is used up', async () => {
    const fetchFn = vi.fn(hang);
    await expect(
      fetchCafes(origin, 1000, {
        urls: ['a', 'b', 'c'],
        timeoutMs: 1000,
        totalTimeoutMs: 30,
        fetchFn,
      }),
    ).rejects.toThrow(/timed out/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
