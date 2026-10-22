import { config } from './config';
import type { LatLng } from './types';

export interface Place {
  label: string;
  position: LatLng;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/** Looks up a typed city or address. Returns null when nothing matches. */
export async function geocode(query: string, signal?: AbortSignal): Promise<Place | null> {
  const params = new URLSearchParams({ q: query.trim(), format: 'jsonv2', limit: '1' });
  const response = await fetch(`${config.nominatimUrl}?${params}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`The address search service is unavailable (HTTP ${response.status}).`);
  }

  const [first] = (await response.json()) as NominatimResult[];
  if (!first) return null;
  return {
    label: first.display_name,
    position: { lat: Number(first.lat), lng: Number(first.lon) },
  };
}
