export interface LatLng {
  lat: number;
  lng: number;
}

export interface Cafe {
  id: string;
  name: string;
  position: LatLng;
  distanceM: number;
  address?: string;
  openingHours?: string;
  website?: string;
}

export interface Review {
  id: string;
  cafeId: string;
  rating: number;
  text: string;
  createdAt: string;
}
