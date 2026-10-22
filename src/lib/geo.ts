import type { LatLng } from './types';

const EARTH_RADIUS_M = 6_371_000;
const WALKING_M_PER_MIN = 83; // about 5 km/h

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points in metres (haversine formula). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 995) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALKING_M_PER_MIN));
}
