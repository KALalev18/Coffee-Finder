import type { OverpassResponse } from '@coffee-finder/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from './app';
import { loadConfig } from './config';

const overpass: OverpassResponse = {
  elements: [
    { type: 'node', id: 1, lat: 60.175, lon: 24.94, tags: { name: 'Kaffa Roastery' } },
    { type: 'node', id: 2, lat: 60.1701, lon: 24.9385, tags: { name: 'Andante' } },
    { type: 'node', id: 3, lat: 60.25, lon: 24.94, tags: { name: 'Too Far' } },
  ],
};

function fakeUpstream() {
  return vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    if (String(url).includes('nominatim')) {
      return new Response(
        JSON.stringify([{ lat: '60.17', lon: '24.94', display_name: 'Kamppi, Helsinki' }]),
      );
    }
    return new Response(JSON.stringify(overpass));
  });
}

async function setup(env: Record<string, string> = {}) {
  const fetchFn = fakeUpstream();
  const app = await buildApp({ config: loadConfig(env), fetchFn, logger: false });
  return { app, fetchFn };
}

let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(async () => app?.close());

describe('GET /api/cafes', () => {
  it('returns cafés within the radius, nearest first', async () => {
    const ctx = await setup();
    app = ctx.app;

    const res = await app.inject('/api/cafes?lat=60.17&lng=24.9384&radius=1500');

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.json().source).toBe('overpass');
    expect(res.json().cafes.map((c: { name: string }) => c.name)).toEqual([
      'Andante',
      'Kaffa Roastery',
    ]);
  });

  it('identifies itself to OpenStreetMap services', async () => {
    const ctx = await setup();
    app = ctx.app;

    await app.inject('/api/cafes?lat=60.17&lng=24.9384');

    const init = ctx.fetchFn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^coffee-finder-api/);
  });

  it('serves nearby searches from the cache', async () => {
    const ctx = await setup();
    app = ctx.app;

    await app.inject('/api/cafes?lat=60.1701&lng=24.9381');
    const second = await app.inject('/api/cafes?lat=60.1709&lng=24.9389');

    expect(second.headers['x-cache']).toBe('HIT');
    expect(ctx.fetchFn).toHaveBeenCalledTimes(1);
    // Distances are still measured from the exact origin of each request.
    expect(second.json().cafes[0].distanceM).toBeGreaterThan(0);
  });

  it.each([
    ['missing coordinates', ''],
    ['latitude out of range', 'lat=91&lng=0'],
    ['radius too large', 'lat=60&lng=24&radius=50000'],
    ['non-numeric input', 'lat=abc&lng=24'],
  ])('rejects %s with 400', async (_name, query) => {
    const ctx = await setup();
    app = ctx.app;

    const res = await app.inject(`/api/cafes?${query}`);

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toEqual(expect.any(String));
    expect(ctx.fetchFn).not.toHaveBeenCalled();
  });

  it('falls back to Nominatim when Overpass is down', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) =>
      String(url).includes('nominatim')
        ? new Response(
            JSON.stringify([
              {
                lat: '60.1701',
                lon: '24.9385',
                display_name: 'Andante',
                name: 'Andante',
                category: 'amenity',
                type: 'cafe',
                osm_type: 'node',
                osm_id: 2,
              },
            ]),
          )
        : new Response('busy', { status: 504 }),
    );
    app = await buildApp({ config: loadConfig({}), fetchFn, logger: false });

    const res = await app.inject('/api/cafes?lat=60.17&lng=24.9384');

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ source: 'nominatim', cafes: [{ name: 'Andante' }] });
  });

  it('returns 502 with a readable message when every upstream server fails', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('busy', { status: 504 }));
    app = await buildApp({ config: loadConfig({}), fetchFn, logger: false });

    const res = await app.inject('/api/cafes?lat=60.17&lng=24.94');

    expect(res.statusCode).toBe(502);
    expect(res.json().error).toMatch(/busy right now/);
    expect((await app.inject('/metrics')).json().cafes.cache.misses).toBe(1);
  });
});

describe('GET /api/geocode', () => {
  it('geocodes a place and caches it case-insensitively', async () => {
    const ctx = await setup();
    app = ctx.app;

    const first = await app.inject('/api/geocode?q=Kamppi');
    const second = await app.inject('/api/geocode?q=kamppi');

    expect(first.json()).toEqual({
      place: { label: 'Kamppi, Helsinki', position: { lat: 60.17, lng: 24.94 } },
    });
    expect(second.headers['x-cache']).toBe('HIT');
    expect(ctx.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejects a query that is too short', async () => {
    const ctx = await setup();
    app = ctx.app;
    expect((await app.inject('/api/geocode?q=a')).statusCode).toBe(400);
  });
});

describe('operations', () => {
  it('limits requests per IP', async () => {
    const ctx = await setup({ RATE_LIMIT_PER_MINUTE: '2' });
    app = ctx.app;

    const codes = [];
    for (let i = 0; i < 3; i++) {
      codes.push((await app.inject('/api/cafes?lat=60.17&lng=24.94')).statusCode);
    }

    expect(codes).toEqual([200, 200, 429]);
    // Health checks from the hosting platform are never limited.
    expect((await app.inject('/health')).statusCode).toBe(200);
  });

  it('only allows configured origins', async () => {
    const ctx = await setup({ CORS_ORIGINS: 'https://app.example' });
    app = ctx.app;

    const allowed = await app.inject({
      url: '/health',
      headers: { origin: 'https://app.example' },
    });
    const other = await app.inject({ url: '/health', headers: { origin: 'https://evil.example' } });

    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('reports cache and latency metrics', async () => {
    const ctx = await setup();
    app = ctx.app;
    await app.inject('/api/cafes?lat=60.17&lng=24.94');
    await app.inject('/api/cafes?lat=60.17&lng=24.94');

    const metrics = (await app.inject('/metrics')).json();

    expect(metrics.cafes.cache).toEqual({ hits: 1, misses: 1, hitRate: 0.5 });
    expect(metrics.cafes.upstream.samples).toBe(1);
    expect(metrics.cafes.response.samples).toBe(2);
    expect(metrics.cacheEntries.cafes).toBe(1);
  });
});
