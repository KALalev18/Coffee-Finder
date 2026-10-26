import type { Cafe } from '@coffee-finder/shared';

export type { Cafe, LatLng, NearbyCafe, Place } from '@coffee-finder/shared';

export interface Review {
  id: string;
  cafeId: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface SavedCafe extends Cafe {
  savedAt: string;
}
