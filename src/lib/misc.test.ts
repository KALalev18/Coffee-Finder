import { describe, expect, it } from 'vitest';
import { parseRadius, parseUrlList } from './config';
import { googleMapsDirectionsUrl, osmDirectionsUrl } from './directions';
import { geolocationMessage } from './geolocation';

const from = { lat: 60.1, lng: 24.9 };
const to = { lat: 60.2, lng: 25.0 };

describe('directions', () => {
  it('builds a walking Google Maps link', () => {
    const url = new URL(googleMapsDirectionsUrl(from, to));
    expect(url.searchParams.get('origin')).toBe('60.1,24.9');
    expect(url.searchParams.get('destination')).toBe('60.2,25');
    expect(url.searchParams.get('travelmode')).toBe('walking');
  });

  it('builds an OpenStreetMap foot route link', () => {
    const url = new URL(osmDirectionsUrl(from, to));
    expect(url.searchParams.get('route')).toBe('60.1,24.9;60.2,25');
    expect(url.searchParams.get('engine')).toBe('fossgis_osrm_foot');
  });
});

describe('parseRadius', () => {
  it('uses the default for missing or invalid values', () => {
    expect(parseRadius(undefined)).toBe(1500);
    expect(parseRadius('')).toBe(1500);
    expect(parseRadius('abc')).toBe(1500);
    expect(parseRadius('-5')).toBe(1500);
  });

  it('accepts valid values and caps them at 5 km', () => {
    expect(parseRadius('800')).toBe(800);
    expect(parseRadius('20000')).toBe(5000);
  });
});

describe('parseUrlList', () => {
  it('splits and trims a comma-separated list', () => {
    expect(parseUrlList(' https://a , https://b,', ['x'])).toEqual(['https://a', 'https://b']);
  });

  it('uses the fallback when empty', () => {
    expect(parseUrlList(undefined, ['x'])).toEqual(['x']);
    expect(parseUrlList(' , ', ['x'])).toEqual(['x']);
  });
});

describe('geolocationMessage', () => {
  it('suggests searching when permission is denied', () => {
    expect(geolocationMessage(1)).toMatch(/denied.*search/i);
  });
});
