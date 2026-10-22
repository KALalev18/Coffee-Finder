import type { LatLng } from './types';

export function googleMapsDirectionsUrl(from: LatLng, to: LatLng): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: 'walking',
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

export function osmDirectionsUrl(from: LatLng, to: LatLng): string {
  const route = `${from.lat},${from.lng};${to.lat},${to.lng}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${encodeURIComponent(route)}`;
}
