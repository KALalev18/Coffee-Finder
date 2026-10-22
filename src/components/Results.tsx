import { forwardRef, useEffect, useRef, useState } from 'react';
import type { Origin } from '../hooks/useCafeSearch';
import { config } from '../lib/config';
import { formatDistance } from '../lib/geo';
import { MAX_RESULTS } from '../lib/overpass';
import { reviewsFor } from '../lib/reviews';
import type { Cafe, Review } from '../lib/types';
import { CafeCard } from './CafeCard';
import { CafeMap } from './CafeMap';

interface ResultsProps {
  origin: Origin;
  cafes: Cafe[];
  reviews: Review[];
  onAddReview: (cafeId: string, rating: number, text: string) => void;
  onDeleteReview: (id: string) => void;
}

function resultsTitle(count: number, place: string): string {
  const where = `within ${formatDistance(config.searchRadiusM)} of ${place}`;
  if (count === 0) return `No cafés found ${where}`;
  if (count === MAX_RESULTS) return `The ${count} nearest cafés ${where}`;
  return `${count} café${count === 1 ? '' : 's'} ${where}`;
}

export const Results = forwardRef<HTMLElement, ResultsProps>(function Results(
  { origin, cafes, reviews, onAddReview, onDeleteReview },
  ref,
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => setSelectedId(null), [cafes]);

  function selectFromMap(id: string) {
    setSelectedId(id);
    cardRefs.current.get(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }

  return (
    <section className="results" ref={ref} aria-labelledby="results-title">
      <h2 id="results-title" className="results__title">
        {resultsTitle(cafes.length, origin.label)}
      </h2>
      {cafes.length === 0 && (
        <p className="muted">Try searching a busier area, such as a city centre.</p>
      )}

      <div className="results__layout">
        <div className="results__map">
          <CafeMap
            origin={origin.position}
            cafes={cafes}
            selectedId={selectedId}
            onSelect={selectFromMap}
          />
        </div>

        {cafes.length > 0 && (
          <ul className="cafe-list">
            {cafes.map((cafe) => (
              <CafeCard
                key={cafe.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(cafe.id, el);
                  else cardRefs.current.delete(cafe.id);
                }}
                cafe={cafe}
                origin={origin.position}
                reviews={reviewsFor(reviews, cafe.id)}
                selected={cafe.id === selectedId}
                onSelect={() => setSelectedId(cafe.id)}
                onAddReview={(rating, text) => onAddReview(cafe.id, rating, text)}
                onDeleteReview={onDeleteReview}
              />
            ))}
          </ul>
        )}
      </div>
      <p className="results__credit">
        Café data © OpenStreetMap contributors, via the Overpass API. Missing a café?{' '}
        <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">
          Add it to OpenStreetMap
        </a>
        .
      </p>
    </section>
  );
});
