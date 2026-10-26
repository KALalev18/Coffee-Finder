import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  averageRating,
  createReview,
  loadReviews,
  reviewsFor,
  saveReviews,
} from './reviews';
import type { Review } from './types';

const review = (overrides: Partial<Review>): Review => ({
  id: 'r',
  cafeId: 'node/1',
  rating: 5,
  text: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('createReview', () => {
  it('trims and limits the text', () => {
    const r = createReview('node/1', 4, `  ${'a'.repeat(600)}  `);
    expect(r.text).toHaveLength(500);
    expect(r.rating).toBe(4);
    expect(r.cafeId).toBe('node/1');
  });

  it.each([0, 6, 2.5, NaN])('rejects rating %s', (rating) => {
    expect(() => createReview('node/1', rating, '')).toThrow(RangeError);
  });
});

describe('storage', () => {
  it('round-trips reviews through localStorage', () => {
    const reviews = [review({ id: 'a' }), review({ id: 'b', rating: 3 })];
    saveReviews(reviews);
    expect(loadReviews()).toEqual(reviews);
  });

  it('returns an empty list for missing or corrupt data', () => {
    expect(loadReviews()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadReviews()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '{"a":1}');
    expect(loadReviews()).toEqual([]);
  });

  it('drops malformed entries but keeps valid ones', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([review({ id: 'ok' }), { id: 'bad' }]));
    expect(loadReviews().map((r) => r.id)).toEqual(['ok']);
  });

  it('does not throw when storage is unavailable', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    } as unknown as Storage;
    expect(loadReviews(broken)).toEqual([]);
    expect(() => saveReviews([review({})], broken)).not.toThrow();
  });
});

describe('reviewsFor / averageRating', () => {
  const all = [
    review({ id: '1', cafeId: 'a', rating: 5, createdAt: '2026-01-01T00:00:00Z' }),
    review({ id: '2', cafeId: 'b', rating: 1 }),
    review({ id: '3', cafeId: 'a', rating: 2, createdAt: '2026-02-01T00:00:00Z' }),
  ];

  it('filters by café, newest first', () => {
    expect(reviewsFor(all, 'a').map((r) => r.id)).toEqual(['3', '1']);
  });

  it('averages ratings and returns null when empty', () => {
    expect(averageRating(reviewsFor(all, 'a'))).toBe(3.5);
    expect(averageRating([])).toBeNull();
  });
});
