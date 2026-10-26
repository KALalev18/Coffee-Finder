import { distanceMeters } from '@coffee-finder/shared';
import { useState } from 'react';
import { reviewsFor } from '../lib/reviews';
import type { LatLng, Review, SavedCafe } from '../lib/types';
import { CafeCard } from './CafeCard';
import { CafeMap } from './CafeMap';

interface SavedPanelProps {
  saved: SavedCafe[];
  /** The current search start, if any; distances are shown from here. */
  origin?: LatLng;
  reviews: Review[];
  onUnsave: (id: string) => void;
  onAddReview: (cafeId: string, rating: number, text: string) => void;
  onDeleteReview: (id: string) => void;
}

export function SavedPanel({
  saved,
  origin,
  reviews,
  onUnsave,
  onAddReview,
  onDeleteReview,
}: SavedPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <section id="saved" className="saved" aria-labelledby="saved-title">
      <h2 id="saved-title" className="section-title">
        Saved cafés ({saved.length})
      </h2>
      {saved.length === 0 ? (
        <p className="muted">Swipe right on a café, or press Save, to keep it here.</p>
      ) : (
        <div className="split">
          <div className="split__map">
            <CafeMap
              origin={origin}
              cafes={saved}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <ul className="cafe-list" aria-label="Saved cafés">
            {saved.map((cafe) => (
              <CafeCard
                key={cafe.id}
                cafe={cafe}
                distanceM={origin && distanceMeters(origin, cafe.position)}
                origin={origin}
                reviews={reviewsFor(reviews, cafe.id)}
                saved
                selected={cafe.id === selectedId}
                onSelect={() => setSelectedId(cafe.id)}
                onToggleSave={() => onUnsave(cafe.id)}
                onAddReview={(rating, text) => onAddReview(cafe.id, rating, text)}
                onDeleteReview={onDeleteReview}
              />
            ))}
          </ul>
        </div>
      )}
      <p className="muted small">Saved cafés and reviews are stored in this browser only.</p>
    </section>
  );
}
