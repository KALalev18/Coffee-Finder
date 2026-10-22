import { config } from './config';
import { distanceMeters } from './geo';
import type { Cafe, LatLng } from './types';

export const MAX_RESULTS = 50;

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

/** Turns raw Overpass elements into named cafés, nearest first. */
export function parseCafes(data: OverpassResponse, origin: LatLng): Cafe[] {
  const cafes: Cafe[] = [];

  for (const el of data.elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const name = el.tags?.name?.trim();
    if (lat === undefined || lng === undefined || !name) continue;

    const tags = el.tags ?? {};
    const position = { lat, lng };
    cafes.push({
      id: `${el.type}/${el.id}`,
      name,
      position,
      distanceM: distanceMeters(origin, position),
      address: formatAddress(tags),
      openingHours: tags.opening_hours,
      website: tags.website ?? tags['contact:website'],
    });
  }

  return cafes.sort((a, b) => a.distanceM - b.distanceM).slice(0, MAX_RESULTS);
}

/**
 * Queries each Overpass server in turn until one answers. A busy or unreachable
 * server moves on to the next; only when all fail is an error shown to the user.
 */
export async function fetchNearbyCafes(
  origin: LatLng,
  radiusM = config.searchRadiusM,
  signal?: AbortSignal,
  urls = config.overpassUrls,
): Promise<Cafe[]> {
  const body = new URLSearchParams({ data: buildCafeQuery(origin, radiusM) });
  let lastProblem = 'no server configured';

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal,
      });
      if (response.ok) {
        return parseCafes((await response.json()) as OverpassResponse, origin);
      }
      lastProblem = `HTTP ${response.status}`;
    } catch (err) {
      if (signal?.aborted) throw err;
      lastProblem = 'network error';
    }
  }

  throw new Error(
    `The café search service is busy right now (${lastProblem}). Please try again in a minute.`,
  );
}
