import { forwardRef, useState } from 'react';
import { averageRating } from '../lib/reviews';
import type { Cafe, LatLng, Review } from '../lib/types';
import { CafeDetails, CafeLinks, Distance, OpenStatus } from './CafeFacts';
import { ReviewPanel } from './ReviewPanel';
import { Stars } from './Stars';

interface CafeCardProps {
  cafe: Cafe;
  distanceM?: number;
  origin?: LatLng;
  reviews: Review[];
  saved: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggleSave: () => void;
  onAddReview: (rating: number, text: string) => void;
  onDeleteReview: (id: string) => void;
}

export const CafeCard = forwardRef<HTMLLIElement, CafeCardProps>(function CafeCard(
  {
    cafe,
    distanceM,
    origin,
    reviews,
    saved,
    selected,
    onSelect,
    onToggleSave,
    onAddReview,
    onDeleteReview,
  },
  ref,
) {
  const [showReviews, setShowReviews] = useState(false);
  const average = averageRating(reviews);

  return (
    <li ref={ref} className={`cafe-card${selected ? ' is-selected' : ''}`}>
      <button type="button" className="cafe-card__head" onClick={onSelect}>
        <h3 className="cafe-card__name">{cafe.name}</h3>
        {distanceM !== undefined && <Distance meters={distanceM} />}
      </button>

      <OpenStatus hours={cafe.openingHours} />
      <CafeDetails cafe={cafe} />

      <div className="cafe-card__rating">
        {average === null ? (
          <span className="muted">No reviews yet</span>
        ) : (
          <>
            <Stars value={average} />
            <span className="muted">
              {average.toFixed(1)} ({reviews.length})
            </span>
          </>
        )}
      </div>

      <div className="cafe-card__actions">
        <button
          type="button"
          className={`chip${saved ? ' chip--saved' : ''}`}
          aria-pressed={saved}
          onClick={onToggleSave}
        >
          {saved ? 'Saved ✓' : 'Save'}
        </button>
        <CafeLinks cafe={cafe} origin={origin} />
        <button
          type="button"
          className="chip"
          aria-expanded={showReviews}
          onClick={() => setShowReviews((v) => !v)}
        >
          {showReviews ? 'Hide reviews' : 'Leave a review'}
        </button>
      </div>

      {showReviews && (
        <ReviewPanel
          cafeName={cafe.name}
          reviews={reviews}
          onAdd={onAddReview}
          onDelete={onDeleteReview}
        />
      )}
    </li>
  );
});
