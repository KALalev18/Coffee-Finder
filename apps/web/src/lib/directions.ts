import type { LatLng } from './types';

/** Without `from`, Google Maps starts from the user's current location. */
export function googleMapsDirectionsUrl(from: LatLng | undefined, to: LatLng): string {
  const params = new URLSearchParams({ api: '1', destination: `${to.lat},${to.lng}` });
  if (from) params.set('origin', `${from.lat},${from.lng}`);
  params.set('travelmode', 'walking');
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Without `from`, OpenStreetMap opens the route planner with only the destination filled in. */
export function osmDirectionsUrl(from: LatLng | undefined, to: LatLng): string {
  const start = from ? `${from.lat},${from.lng}` : '';
  const route = `${start};${to.lat},${to.lng}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${encodeURIComponent(route)}`;
}
