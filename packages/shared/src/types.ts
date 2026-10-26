export interface LatLng {
  lat: number;
  lng: number;
}

/** A café as stored in OpenStreetMap, independent of where the user is. */
export interface Cafe {
  id: string;
  name: string;
  position: LatLng;
  address?: string;
  openingHours?: string;
  website?: string;
}

/** A café in a search result, with its distance from the search origin. */
export interface NearbyCafe extends Cafe {
  distanceM: number;
}

/** A geocoded starting point. */
export interface Place {
  label: string;
  position: LatLng;
}

/** Where café results came from: Overpass normally, Nominatim as the backup, or sample data. */
export type CafeDataSource = 'overpass' | 'nominatim' | 'demo';

/** Body of `GET /api/cafes`. */
export interface CafesResponse {
  cafes: NearbyCafe[];
  source: CafeDataSource;
}

/** Body of `GET /api/geocode`. `place` is null when nothing matches. */
export interface GeocodeResponse {
  place: Place | null;
}

/** Body of every non-2xx API response. */
export interface ApiError {
  error: string;
}
