import type { CafeDataSource } from '@coffee-finder/shared';
import { useCallback, useRef, useState } from 'react';
import type { CafeSource } from '../lib/sources';
import type { NearbyCafe, Place } from '../lib/types';

export type SearchStatus = 'idle' | 'locating' | 'searching' | 'done' | 'error';

/**
 * Runs the two-step search: find a starting point (device location or typed place),
 * then ask the source for cafés around it. A newer search cancels an older one.
 */
export function useCafeSearch(source: CafeSource) {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [origin, setOrigin] = useState<Place | null>(null);
  const [cafes, setCafes] = useState<NearbyCafe[]>([]);
  const [radiusM, setRadiusM] = useState(0);
  const [dataSource, setDataSource] = useState<CafeDataSource>('overpass');
  const [searchId, setSearchId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (findOrigin: (signal: AbortSignal) => Promise<Place>, radius: number) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setError(null);

      try {
        setStatus('locating');
        const start = await findOrigin(controller.signal);
        if (controller.signal.aborted) return;

        setStatus('searching');
        const found = await source.findCafes(start.position, radius, controller.signal);
        if (controller.signal.aborted) return;
        setOrigin(start);
        setCafes(found.cafes);
        setDataSource(found.source);
        setRadiusM(radius);
        setSearchId((id) => id + 1);
        setStatus('done');
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        setStatus('error');
      }
    },
    [source],
  );

  const searchNearMe = useCallback(
    (radius: number) => run(() => source.locate(), radius),
    [run, source],
  );

  const searchNearPlace = useCallback(
    (query: string, radius: number) =>
      run(async (signal) => {
        const place = await source.geocode(query, signal);
        if (!place) throw new Error(`No place called "${query.trim()}" was found.`);
        return place;
      }, radius),
    [run, source],
  );

  return {
    status,
    origin,
    cafes,
    source: dataSource,
    radiusM,
    searchId,
    error,
    searchNearMe,
    searchNearPlace,
  };
}
