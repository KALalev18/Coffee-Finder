import { useCallback, useRef, useState } from 'react';
import { getCurrentPosition } from '../lib/geolocation';
import { geocode } from '../lib/nominatim';
import { fetchNearbyCafes } from '../lib/overpass';
import type { Cafe, LatLng } from '../lib/types';

export type SearchStatus = 'idle' | 'locating' | 'searching' | 'done' | 'error';

export interface Origin {
  position: LatLng;
  label: string;
}

/**
 * Runs the two-step search: find a starting point (device location or typed place),
 * then ask Overpass for cafés around it. A newer search cancels an older one.
 */
export function useCafeSearch() {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (findOrigin: (signal: AbortSignal) => Promise<Origin>) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);

    try {
      setStatus('locating');
      const start = await findOrigin(controller.signal);
      if (controller.signal.aborted) return;
      setOrigin(start);

      setStatus('searching');
      const found = await fetchNearbyCafes(start.position, undefined, controller.signal);
      if (controller.signal.aborted) return;
      setCafes(found);
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }, []);

  const searchNearMe = useCallback(
    () => run(async () => ({ position: await getCurrentPosition(), label: 'your location' })),
    [run],
  );

  const searchNearPlace = useCallback(
    (query: string) =>
      run(async (signal) => {
        const place = await geocode(query, signal);
        if (!place) throw new Error(`No place called "${query.trim()}" was found.`);
        return place;
      }),
    [run],
  );

  return { status, origin, cafes, error, searchNearMe, searchNearPlace };
}
