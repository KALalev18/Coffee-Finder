import { describe, expect, it, vi } from 'vitest';
import { isDemo, parseRadius, parseUrlList } from './config';
import { googleMapsDirectionsUrl, osmDirectionsUrl } from './directions';
import { geolocationMessage } from './geolocation';
import { apiSource } from './sources';

const from = { lat: 60.1, lng: 24.9 };
const to = { lat: 60.2, lng: 25.0 };

describe('directions', () => {
  it('builds a walking Google Maps link', () => {
    const url = new URL(googleMapsDirectionsUrl(from, to));
    expect(url.searchParams.get('origin')).toBe('60.1,24.9');
    expect(url.searchParams.get('destination')).toBe('60.2,25');
    expect(url.searchParams.get('travelmode')).toBe('walking');
  });

  it('leaves the start to the map app when there is no origin', () => {
    expect(new URL(googleMapsDirectionsUrl(undefined, to)).searchParams.has('origin')).toBe(false);
    expect(new URL(osmDirectionsUrl(undefined, to)).searchParams.get('route')).toBe(';60.2,25');
  });

  it('builds an OpenStreetMap foot route link', () => {
    const url = new URL(osmDirectionsUrl(from, to));
    expect(url.searchParams.get('route')).toBe('60.1,24.9;60.2,25');
    expect(url.searchParams.get('engine')).toBe('fossgis_osrm_foot');
  });
});

describe('config parsing', () => {
  it('uses the default radius for missing or invalid values', () => {
    expect(parseRadius(undefined)).toBe(1500);
    expect(parseRadius('')).toBe(1500);
    expect(parseRadius('abc')).toBe(1500);
    expect(parseRadius('-5')).toBe(1500);
  });

  it('accepts valid radii and caps them at 5 km', () => {
    expect(parseRadius('800')).toBe(800);
    expect(parseRadius('20000')).toBe(5000);
  });

  it('splits and trims URL lists, falling back when empty', () => {
    expect(parseUrlList(' https://a , https://b,', ['x'])).toEqual(['https://a', 'https://b']);
    expect(parseUrlList(' , ', ['x'])).toEqual(['x']);
  });

  it('turns on demo mode from the URL or the build flag', () => {
    expect(isDemo('?demo', undefined)).toBe(true);
    expect(isDemo('?q=1', 'true')).toBe(true);
    expect(isDemo('', undefined)).toBe(false);
  });
});

describe('geolocationMessage', () => {
  it('suggests searching when permission is denied', () => {
    expect(geolocationMessage(1)).toMatch(/denied.*search/i);
  });
});

describe('apiSource', () => {
  it('calls the API and shows its error message', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ cafes: [] })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Too many searches.' }), { status: 429 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const source = apiSource('https://api.example');
    const signal = new AbortController().signal;

    await source.findCafes({ lat: 60.1, lng: 24.9 }, 1000, signal);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example/api/cafes?lat=60.1&lng=24.9&radius=1000',
    );
    await expect(source.geocode('Kamppi', signal)).rejects.toThrow('Too many searches.');
    vi.unstubAllGlobals();
  });
});
