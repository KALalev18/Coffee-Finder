import type { Review } from './types';

export const STORAGE_KEY = 'velvet-brew:reviews';
export const MAX_REVIEW_LENGTH = 500;

function isReview(value: unknown): value is Review {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.cafeId === 'string' &&
    typeof r.rating === 'number' &&
    typeof r.text === 'string' &&
    typeof r.createdAt === 'string'
  );
}

/** Reads all saved reviews. Corrupt or blocked storage is treated as "no reviews". */
export function loadReviews(storage: Storage = localStorage): Review[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isReview) : [];
  } catch {
    return [];
  }
}

export function saveReviews(reviews: Review[], storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // Storage can be full or blocked (private mode); reviews then only last for this visit.
  }
}

export function createReview(cafeId: string, rating: number, text: string): Review {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new RangeError('Rating must be a whole number from 1 to 5.');
  }
  return {
    id: crypto.randomUUID(),
    cafeId,
    rating,
    text: text.trim().slice(0, MAX_REVIEW_LENGTH),
    createdAt: new Date().toISOString(),
  };
}

export function reviewsFor(reviews: Review[], cafeId: string): Review[] {
  return reviews
    .filter((r) => r.cafeId === cafeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function averageRating(reviews: Review[]): number | null {
  if (reviews.length === 0) return null;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}
