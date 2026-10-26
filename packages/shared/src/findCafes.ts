import { searchCafesNominatim } from './nominatim';
import { fetchCafes } from './overpass';
import type { Cafe, CafeDataSource, LatLng } from './types';

export interface FindCafesOptions {
  overpassUrls?: string[];
  nominatimUrl?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  fetchFn?: typeof fetch;
  /** Wraps the Nominatim call, e.g. to keep to its one-request-per-second limit. */
  nominatimSlot?: <T>(task: () => Promise<T>) => Promise<T>;
}

/**
 * Overpass first, because it returns every café in the area with full details.
 * If every Overpass server fails, Nominatim's place search is the backup.
 * If both fail, the Overpass error is reported, since that is the main source.
 */
export async function findCafes(
  origin: LatLng,
  radiusM: number,
  { overpassUrls, nominatimUrl, signal, headers, fetchFn, nominatimSlot }: FindCafesOptions = {},
): Promise<{ cafes: Cafe[]; source: CafeDataSource }> {
  try {
    const cafes = await fetchCafes(origin, radiusM, {
      urls: overpassUrls,
      signal,
      headers,
      fetchFn,
    });
    return { cafes, source: 'overpass' };
  } catch (overpassError) {
    if (signal?.aborted) throw overpassError;
    try {
      const run = nominatimSlot ?? ((task) => task());
      const cafes = await run(() =>
        searchCafesNominatim(origin, radiusM, { url: nominatimUrl, signal, headers, fetchFn }),
      );
      return { cafes, source: 'nominatim' };
    } catch (fallbackError) {
      if (signal?.aborted) throw fallbackError;
      throw overpassError;
    }
  }
}
