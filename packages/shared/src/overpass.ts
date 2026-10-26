import { distanceMeters } from './geo';
import type { Cafe, LatLng, NearbyCafe } from './types';

export const MAX_RESULTS = 50;
export const MAX_RADIUS_M = 5000;

// Public Overpass servers are often busy, so callers fall back through a list of mirrors.
export const DEFAULT_OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

export function buildCafeQuery(origin: LatLng, radiusM: number): string {
  const around = `(around:${Math.round(radiusM)},${origin.lat},${origin.lng})`;
  return `[out:json][timeout:25];(node["amenity"="cafe"]${around};way["amenity"="cafe"]${around};);out center tags;`;
}

function formatAddress(tags: Record<string, string>): string | undefined {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const parts = [street, tags['addr:city']].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

/**
 * OpenStreetMap tags are user-edited, so a website could be a `javascript:` URL.
 * Only http(s) links are kept; a bare domain like "cafe.fi" gets https:// added.
 */
export function safeWebsite(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** Turns raw Overpass elements into named cafés. Unnamed cafés and elements without coordinates are dropped. */
export function parseCafes(data: OverpassResponse): Cafe[] {
  const cafes: Cafe[] = [];

  for (const el of data.elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const name = el.tags?.name?.trim();
    if (lat === undefined || lng === undefined || !name) continue;

    const tags = el.tags ?? {};
    cafes.push({
      id: `${el.type}/${el.id}`,
      name,
      position: { lat, lng },
      address: formatAddress(tags),
      openingHours: tags.opening_hours,
      website: safeWebsite(tags.website ?? tags['contact:website']),
    });
  }

  return cafes;
}

/** Adds distances from `origin`, drops cafés outside `radiusM`, and keeps the nearest `limit`. */
export function rankByDistance(
  cafes: Cafe[],
  origin: LatLng,
  radiusM = Infinity,
  limit = MAX_RESULTS,
): NearbyCafe[] {
  return cafes
    .map((cafe) => ({ ...cafe, distanceM: distanceMeters(origin, cafe.position) }))
    .filter((cafe) => cafe.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}

/** A stalled mirror is abandoned after this long so the next one can be tried. */
export const SERVER_TIMEOUT_MS = 8_000;
/** Total time for all mirrors, so a caller with a fallback isn't kept waiting. */
export const TOTAL_TIMEOUT_MS = 15_000;

export interface OverpassOptions {
  urls?: string[];
  signal?: AbortSignal;
  headers?: Record<string, string>;
  timeoutMs?: number;
  totalTimeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Queries each Overpass server in turn until one answers. A busy, unreachable or
 * stalled server moves on to the next; when all fail, or the total time budget is
 * used up, an error is thrown.
 */
export async function fetchCafes(
  origin: LatLng,
  radiusM: number,
  {
    urls = DEFAULT_OVERPASS_URLS,
    signal,
    headers,
    timeoutMs = SERVER_TIMEOUT_MS,
    totalTimeoutMs = TOTAL_TIMEOUT_MS,
    fetchFn = fetch,
  }: OverpassOptions = {},
): Promise<Cafe[]> {
  const body = new URLSearchParams({ data: buildCafeQuery(origin, radiusM) });
  const deadline = Date.now() + totalTimeoutMs;
  let lastProblem = 'no server configured';

  for (const url of urls) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const timeout = AbortSignal.timeout(Math.min(timeoutMs, remaining));
    try {
      const response = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
        body,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (response.ok) return parseCafes((await response.json()) as OverpassResponse);
      lastProblem = `HTTP ${response.status}`;
    } catch (err) {
      if (signal?.aborted) throw err;
      lastProblem = timeout.aborted ? 'timed out' : 'network error';
    }
  }

  throw new Error(
    `The café search service is busy right now (${lastProblem}). Please try again in a minute.`,
  );
}
