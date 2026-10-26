import { describe, expect, it, vi } from 'vitest';
import { findCafes } from './findCafes';
import { searchCafesNominatim, viewbox } from './nominatim';

const origin = { lat: 60.1699, lng: 24.9384 };

const nominatimCafes = [
  {
    lat: '60.1699670',
    lon: '24.9375180',
    display_name: 'Cafe Java, Helsinki',
    name: 'Cafe Java',
    category: 'amenity',
    type: 'cafe',
    osm_type: 'node',
    osm_id: 60068035,
    address: { road: 'Lasipalatsinaukio', house_number: '1', city: 'Helsinki' },
    extratags: { opening_hours: 'Mo-Su 09:00-21:00', website: 'javascript:alert(1)' },
  },
  // Not a café, and a café without a name: both dropped.
  {
    lat: '60.17',
    lon: '24.94',
    display_name: 'x',
    name: 'Bus stop',
    category: 'highway',
    type: 'bus_stop',
  },
  { lat: '60.17', lon: '24.94', display_name: 'y', name: ' ', category: 'amenity', type: 'cafe' },
];

const overpass = {
  elements: [{ type: 'node', id: 1, lat: 60.17, lon: 24.94, tags: { name: 'Andante' } }],
};

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('viewbox', () => {
  it('covers the search circle, accounting for narrower longitude degrees', () => {
    const [west, north, east, south] = viewbox(origin, 1000).split(',').map(Number);
    expect(north - origin.lat).toBeCloseTo(0.00898, 4);
    expect(origin.lat - south).toBeCloseTo(0.00898, 4);
    // At 60°N a degree of longitude is half as long, so the box is twice as wide in degrees.
    expect(east - origin.lng).toBeCloseTo(0.018, 3);
    expect(origin.lng - west).toBeCloseTo(0.018, 3);
  });
});

describe('searchCafesNominatim', () => {
  it('asks for café places inside the area and maps them to cafés', async () => {
    const fetchFn = vi.fn().mockResolvedValue(respond(nominatimCafes));

    const cafes = await searchCafesNominatim(origin, 1000, { url: 'https://geo.test', fetchFn });

    expect(cafes).toEqual([
      {
        id: 'node/60068035',
        name: 'Cafe Java',
        position: { lat: 60.169967, lng: 24.937518 },
        address: 'Lasipalatsinaukio 1, Helsinki',
        openingHours: 'Mo-Su 09:00-21:00',
        website: undefined,
      },
    ]);
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.searchParams.get('q')).toBe('cafe');
    expect(url.searchParams.get('bounded')).toBe('1');
    expect(url.searchParams.get('viewbox')).toBe(viewbox(origin, 1000));
  });
});

describe('findCafes', () => {
  it('uses Overpass when it answers', async () => {
    const fetchFn = vi.fn().mockResolvedValue(respond(overpass));
    const result = await findCafes(origin, 1000, { overpassUrls: ['a'], fetchFn });
    expect(result.source).toBe('overpass');
    expect(result.cafes.map((c) => c.name)).toEqual(['Andante']);
  });

  it('falls back to Nominatim when every Overpass server fails', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) =>
      String(url).startsWith('https://geo.test') ? respond(nominatimCafes) : respond('busy', 504),
    );
    let slotCalls = 0;
    const slot = <T>(task: () => Promise<T>) => {
      slotCalls++;
      return task();
    };

    const result = await findCafes(origin, 1000, {
      overpassUrls: ['a', 'b'],
      nominatimUrl: 'https://geo.test',
      fetchFn,
      nominatimSlot: slot,
    });

    expect(result.source).toBe('nominatim');
    expect(result.cafes.map((c) => c.name)).toEqual(['Cafe Java']);
    expect(slotCalls).toBe(1);
  });

  it('reports the Overpass error when the backup fails too', async () => {
    const fetchFn = vi.fn().mockResolvedValue(respond('down', 503));
    await expect(findCafes(origin, 1000, { overpassUrls: ['a'], fetchFn })).rejects.toThrow(
      /café search service is busy right now \(HTTP 503\)/,
    );
  });

  it('does not fall back after the search is cancelled', async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    await expect(
      findCafes(origin, 1000, { overpassUrls: ['a'], signal: controller.signal, fetchFn }),
    ).rejects.toThrow('Aborted');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
