import type { LatLng } from '@coffee-finder/shared';

/**
 * Cell size in degrees. 0.0025° of latitude is about 278 m, and a degree of
 * longitude is never longer than a degree of latitude, so any point is at most
 * about 197 m (half the cell diagonal) from its cell centre.
 */
export const CELL_DEG = 0.0025;
export const CELL_PADDING_M = 200;

/**
 * Snaps a search to the centre of its grid cell so nearby searches share a cache entry.
 * The upstream query uses the cell centre with a radius padded by the worst-case
 * snapping error, so it always contains every café within `radiusM` of the real origin.
 */
export function snapToGrid(origin: LatLng, radiusM: number) {
  const snap = (deg: number) => (Math.floor(deg / CELL_DEG) + 0.5) * CELL_DEG;
  const center = { lat: snap(origin.lat), lng: snap(origin.lng) };
  return {
    center,
    queryRadiusM: radiusM + CELL_PADDING_M,
    key: `${center.lat.toFixed(5)},${center.lng.toFixed(5)},${radiusM}`,
  };
}
