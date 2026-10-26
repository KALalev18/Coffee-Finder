import { useCallback, useState } from 'react';
import { createReview, loadReviews, saveReviews } from '../lib/reviews';
import type { Review } from '../lib/types';

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>(() => loadReviews());

  const addReview = useCallback((cafeId: string, rating: number, text: string) => {
    setReviews((current) => {
      const next = [...current, createReview(cafeId, rating, text)];
      saveReviews(next);
      return next;
    });
  }, []);

  const deleteReview = useCallback((id: string) => {
    setReviews((current) => {
      const next = current.filter((r) => r.id !== id);
      saveReviews(next);
      return next;
    });
  }, []);

  return { reviews, addReview, deleteReview };
}
