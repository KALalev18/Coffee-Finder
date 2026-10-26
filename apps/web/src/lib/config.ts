import { DEFAULT_NOMINATIM_URL, DEFAULT_OVERPASS_URLS, MAX_RADIUS_M } from '@coffee-finder/shared';

export const RADIUS_OPTIONS_M = [500, 1000, 1500, 3000, 5000];
const DEFAULT_RADIUS_M = 1500;

export function parseRadius(raw: string | undefined): number {
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) return DEFAULT_RADIUS_M;
  return Math.min(value, MAX_RADIUS_M);
}

export function parseUrlList(raw: string | undefined, fallback: string[]): string[] {
  const urls = (raw ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  return urls.length ? urls : fallback;
}

/** Demo mode uses bundled sample data: on with VITE_DEMO=true or `?demo` in the URL. */
export function isDemo(search: string, flag: string | undefined): boolean {
  return flag === 'true' || new URLSearchParams(search).has('demo');
}

export const config = {
  /** Base URL of the Coffee Finder API. Empty means the browser calls OpenStreetMap directly. */
  apiUrl: (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, ''),
  demo: isDemo(window.location.search, import.meta.env.VITE_DEMO),
  overpassUrls: parseUrlList(import.meta.env.VITE_OVERPASS_URLS, DEFAULT_OVERPASS_URLS),
  nominatimUrl: import.meta.env.VITE_NOMINATIM_URL || DEFAULT_NOMINATIM_URL,
  defaultRadiusM: parseRadius(import.meta.env.VITE_SEARCH_RADIUS_M),
};
