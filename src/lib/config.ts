const MAX_RADIUS_M = 5000;
const DEFAULT_RADIUS_M = 1500;

// Public Overpass servers are often busy, so the app falls back through a list of mirrors.
const DEFAULT_OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

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

export const config = {
  overpassUrls: parseUrlList(import.meta.env.VITE_OVERPASS_URLS, DEFAULT_OVERPASS_URLS),
  nominatimUrl: import.meta.env.VITE_NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search',
  searchRadiusM: parseRadius(import.meta.env.VITE_SEARCH_RADIUS_M),
};
