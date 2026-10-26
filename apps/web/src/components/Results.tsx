import {
  MAX_RESULTS,
  NOMINATIM_MAX_RESULTS,
  formatDistance,
  type CafeDataSource,
} from '@coffee-finder/shared';
import { forwardRef, useRef, useState } from 'react';
import { isOpenAt } from '../lib/openingHours';
import { reviewsFor } from '../lib/reviews';
import type { Cafe, NearbyCafe, Place, Review } from '../lib/types';
import { CafeCard } from './CafeCard';
import { CafeMap } from './CafeMap';
import { SwipeDeck } from './SwipeDeck';

type View = 'swipe' | 'list';

interface ResultsProps {
  origin: Place;
  radiusM: number;
  cafes: NearbyCafe[];
  source: CafeDataSource;
  reviews: Review[];
  savedIds: ReadonlySet<string>;
  onSave: (cafe: Cafe) => void;
  onUnsave: (id: string) => void;
  onAddReview: (cafeId: string, rating: number, text: string) => void;
  onDeleteReview: (id: string) => void;
}

function resultsTitle(count: number, radiusM: number, place: string): string {
  const where = `within ${formatDistance(radiusM)} of ${place}`;
  if (count === 0) return `No cafés found ${where}`;
  if (count === MAX_RESULTS) return `The ${count} nearest cafés ${where}`;
  return `${count} café${count === 1 ? '' : 's'} ${where}`;
}

export const Results = forwardRef<HTMLElement, ResultsProps>(function Results(
  {
    origin,
    radiusM,
    cafes,
    source,
    reviews,
    savedIds,
    onSave,
    onUnsave,
    onAddReview,
    onDeleteReview,
  },
  ref,
) {
  const [view, setView] = useState<View>('swipe');
  const [openNow, setOpenNow] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLLIElement>());

  const now = new Date();
  const visible = openNow ? cafes.filter((c) => isOpenAt(c.openingHours, now) === true) : cafes;

  function selectFromMap(id: string) {
    setSelectedId(id);
    cardRefs.current.get(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }

  return (
    <section className="results" ref={ref} aria-labelledby="results-title">
      <h2 id="results-title" className="section-title">
        {resultsTitle(cafes.length, radiusM, origin.label)}
      </h2>
      {source === 'nominatim' && (
        <p className="notice" role="status">
          The main café server is busy, so these results come from the backup search (up to{' '}
          {NOMINATIM_MAX_RESULTS} cafés, some details may be missing).
        </p>
      )}

      {cafes.length === 0 ? (
        <p className="muted">Try a larger radius or a busier area, such as a city centre.</p>
      ) : (
        <>
          <div className="toolbar">
            <div className="segmented" role="group" aria-label="View">
              {(['swipe', 'list'] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                  {v === 'swipe' ? 'Swipe' : 'Map & list'}
                </button>
              ))}
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(e) => setOpenNow(e.target.checked)}
              />
              Open now
              {openNow && (
                <span className="muted">
                  {' '}
                  ({visible.length} of {cafes.length})
                </span>
              )}
            </label>
          </div>
          {openNow && (
            <p className="toolbar__note muted">
              Only cafés whose opening hours are listed in OpenStreetMap can be shown as open.
            </p>
          )}

          {view === 'swipe' ? (
            <SwipeDeck
              cafes={visible}
              origin={origin.position}
              savedIds={savedIds}
              onSave={onSave}
              onUnsave={onUnsave}
            />
          ) : (
            <div className="split">
              <div className="split__map">
                <CafeMap
                  origin={origin.position}
                  cafes={visible}
                  selectedId={selectedId}
                  onSelect={selectFromMap}
                />
              </div>
              <ul className="cafe-list">
                {visible.map((cafe) => (
                  <CafeCard
                    key={cafe.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(cafe.id, el);
                      else cardRefs.current.delete(cafe.id);
                    }}
                    cafe={cafe}
                    distanceM={cafe.distanceM}
                    origin={origin.position}
                    reviews={reviewsFor(reviews, cafe.id)}
                    saved={savedIds.has(cafe.id)}
                    selected={cafe.id === selectedId}
                    onSelect={() => setSelectedId(cafe.id)}
                    onToggleSave={() => (savedIds.has(cafe.id) ? onUnsave(cafe.id) : onSave(cafe))}
                    onAddReview={(rating, text) => onAddReview(cafe.id, rating, text)}
                    onDeleteReview={onDeleteReview}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
});
