import type { LatLng } from './types';

export function geolocationMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location access was denied. Search for a city or address instead.';
    case 2:
      return 'Your location could not be determined. Search for a city or address instead.';
    case 3:
      return 'Finding your location took too long. Try again or search instead.';
    default:
      return 'Something went wrong while finding your location.';
  }
}

export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(
        new Error('Your browser does not support location access. Search for a place instead.'),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(geolocationMessage(err.code))),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
