import {
  findCafes,
  geocode,
  rankByDistance,
  type ApiError,
  type CafesResponse,
  type GeocodeResponse,
} from '@coffee-finder/shared';
import type { config as appConfig } from './config';
import { DEMO_CAFES, DEMO_ORIGIN } from './demoData';
import { getCurrentPosition } from './geolocation';
import type { LatLng, Place } from './types';

/** Where the app gets its starting point and cafés from. */
export interface CafeSource {
  locate(): Promise<Place>;
  geocode(query: string, signal: AbortSignal): Promise<Place | null>;
  findCafes(origin: LatLng, radiusM: number, signal: AbortSignal): Promise<CafesResponse>;
}

const locateDevice = async (): Promise<Place> => ({
  position: await getCurrentPosition(),
  label: 'your location',
});

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body as Partial<ApiError> | null)?.error;
    throw new Error(message ?? `The café service is unavailable (HTTP ${response.status}).`);
  }
  return body as T;
}

/** Goes through the Coffee Finder API, which caches and rate-limits upstream calls. */
export function apiSource(baseUrl: string): CafeSource {
  return {
    locate: locateDevice,
    async geocode(query, signal) {
      const params = new URLSearchParams({ q: query.trim() });
      return (await getJson<GeocodeResponse>(`${baseUrl}/api/geocode?${params}`, signal)).place;
    },
    async findCafes(origin, radiusM, signal) {
      const params = new URLSearchParams({
        lat: String(origin.lat),
        lng: String(origin.lng),
        radius: String(radiusM),
      });
      return getJson<CafesResponse>(`${baseUrl}/api/cafes?${params}`, signal);
    },
  };
}

/** Calls the public OpenStreetMap services from the browser, for static hosting without the API. */
export function directSource(overpassUrls: string[], nominatimUrl: string): CafeSource {
  return {
    locate: locateDevice,
    geocode: (query, signal) => geocode(query, { url: nominatimUrl, signal }),
    async findCafes(origin, radiusM, signal) {
      const { cafes, source } = await findCafes(origin, radiusM, {
        overpassUrls,
        nominatimUrl,
        signal,
      });
      return { cafes: rankByDistance(cafes, origin, radiusM), source };
    },
  };
}

/** Bundled sample data around central Helsinki; needs no network or location access. */
export const demoSource: CafeSource = {
  locate: async () => DEMO_ORIGIN,
  geocode: async () => DEMO_ORIGIN,
  findCafes: async (origin, radiusM) => ({
    cafes: rankByDistance(DEMO_CAFES, origin, radiusM),
    source: 'demo',
  }),
};

export function selectSource(cfg: typeof appConfig): CafeSource {
  if (cfg.demo) return demoSource;
  if (cfg.apiUrl) return apiSource(cfg.apiUrl);
  return directSource(cfg.overpassUrls, cfg.nominatimUrl);
}
