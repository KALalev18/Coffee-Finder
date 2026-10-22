import { forwardRef, useState } from 'react';
import { googleMapsDirectionsUrl, osmDirectionsUrl } from '../lib/directions';
import { formatDistance, walkingMinutes } from '../lib/geo';
import { averageRating } from '../lib/reviews';
import type { Cafe, LatLng, Review } from '../lib/types';
import { ReviewPanel } from './ReviewPanel';
import { Stars } from './Stars';

interface CafeCardProps {
  cafe: Cafe;
  origin: LatLng;
  reviews: Review[];
  selected: boolean;
  onSelect: () => void;
  onAddReview: (rating: number, text: string) => void;
  onDeleteReview: (id: string) => void;
}

export const CafeCard = forwardRef<HTMLLIElement, CafeCardProps>(function CafeCard(
  { cafe, origin, reviews, selected, onSelect, onAddReview, onDeleteReview },
  ref,
) {
  const [showReviews, setShowReviews] = useState(false);
  const average = averageRating(reviews);

  return (
    <li ref={ref} className={`cafe-card${selected ? ' is-selected' : ''}`}>
      <button type="button" className="cafe-card__head" onClick={onSelect}>
        <h3 className="cafe-card__name">{cafe.name}</h3>
        <span className="cafe-card__distance">
          {formatDistance(cafe.distanceM)}
          <small> · {walkingMinutes(cafe.distanceM)} min walk</small>
        </span>
      </button>

      {cafe.address && <p className="cafe-card__line">{cafe.address}</p>}
      {cafe.openingHours && (
        <p className="cafe-card__line cafe-card__hours" title="Opening hours from OpenStreetMap">
          {cafe.openingHours}
        </p>
      )}

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
        <a
          className="chip chip--primary"
          href={googleMapsDirectionsUrl(origin, cafe.position)}
          target="_blank"
          rel="noreferrer"
        >
          Directions
        </a>
        <a
          className="chip"
          href={osmDirectionsUrl(origin, cafe.position)}
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap
        </a>
        {cafe.website && (
          <a className="chip" href={cafe.website} target="_blank" rel="noreferrer">
            Website
          </a>
        )}
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
