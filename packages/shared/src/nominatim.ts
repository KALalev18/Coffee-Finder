import { safeWebsite } from './overpass';
import type { Cafe, LatLng, Place } from './types';

export const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
/** Nominatim returns at most this many results per request. */
export const NOMINATIM_MAX_RESULTS = 40;
const TIMEOUT_MS = 10_000;
const METRES_PER_DEGREE = 111_320;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  category?: string;
  type?: string;
  osm_type?: string;
  osm_id?: number;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
}

export interface GeocodeOptions {
  url?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  fetchFn?: typeof fetch;
}

async function search(
  params: Record<string, string>,
  { url = DEFAULT_NOMINATIM_URL, signal, headers, fetchFn = fetch }: GeocodeOptions,
): Promise<NominatimResult[]> {
  const query = new URLSearchParams({ format: 'jsonv2', ...params });
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetchFn(`${url}?${query}`, {
    headers: { Accept: 'application/json', ...headers },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) {
    throw new Error(`The address search service is unavailable (HTTP ${response.status}).`);
  }
  return (await response.json()) as NominatimResult[];
}

/** Looks up a typed city or address with Nominatim. Returns null when nothing matches. */
export async function geocode(query: string, options: GeocodeOptions = {}): Promise<Place | null> {
  const [first] = await search({ q: query.trim(), limit: '1' }, options);
  if (!first) return null;
  return {
    label: first.display_name,
    position: { lat: Number(first.lat), lng: Number(first.lon) },
  };
}

/** The bounding box around `origin` that contains the search circle, as Nominatim's viewbox. */
export function viewbox(origin: LatLng, radiusM: number): string {
  const dLat = radiusM / METRES_PER_DEGREE;
  const dLng = radiusM / (METRES_PER_DEGREE * Math.cos((origin.lat * Math.PI) / 180));
  return [origin.lng - dLng, origin.lat + dLat, origin.lng + dLng, origin.lat - dLat]
    .map((n) => n.toFixed(6))
    .join(',');
}

/**
 * Backup café search for when every Overpass server fails: Nominatim's place search,
 * limited to the search area. It returns at most 40 places, not sorted by distance,
 * so in busy city centres it can miss some cafés. The caller ranks and trims by radius.
 */
export async function searchCafesNominatim(
  origin: LatLng,
  radiusM: number,
  options: GeocodeOptions = {},
): Promise<Cafe[]> {
  const results = await search(
    {
      q: 'cafe',
      layer: 'poi',
      bounded: '1',
      viewbox: viewbox(origin, radiusM),
      limit: String(NOMINATIM_MAX_RESULTS),
      extratags: '1',
      addressdetails: '1',
    },
    options,
  );

  return results
    .filter((r) => r.category === 'amenity' && r.type === 'cafe' && r.name?.trim())
    .map((r) => {
      const tags = r.extratags ?? {};
      const a = r.address ?? {};
      const street = [a.road, a.house_number].filter(Boolean).join(' ');
      const address = [street, a.city ?? a.town ?? a.village].filter(Boolean).join(', ');
      return {
        id: `${r.osm_type}/${r.osm_id}`,
        name: r.name!.trim(),
        position: { lat: Number(r.lat), lng: Number(r.lon) },
        address: address || undefined,
        openingHours: tags.opening_hours,
        website: safeWebsite(tags.website ?? tags['contact:website']),
      };
    });
}
