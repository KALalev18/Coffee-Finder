import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Results } from './components/Results';
import { SavedPanel } from './components/SavedPanel';
import { useCafeSearch } from './hooks/useCafeSearch';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useReviews } from './hooks/useReviews';
import { useSaved } from './hooks/useSaved';
import { config } from './lib/config';
import { selectSource, type CafeSource } from './lib/sources';

const defaultSource = selectSource(config);

interface AppProps {
  /** Injected in tests; the app picks the API, direct or demo source from config otherwise. */
  source?: CafeSource;
  demo?: boolean;
}

export default function App({ source = defaultSource, demo = config.demo }: AppProps) {
  const search = useCafeSearch(source);
  const { reviews, addReview, deleteReview } = useReviews();
  const { saved, savedIds, save, unsave } = useSaved();
  const [radiusM, setRadiusM] = useState(config.defaultRadiusM);
  const resultsRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { status, origin } = search;

  useEffect(() => {
    if (status !== 'done') return;
    resultsRef.current?.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [status, search.searchId, reducedMotion]);

  return (
    <>
      <div className="top">
        {demo && (
          <p className="demo-banner">
            Demo mode: made-up cafés around Helsinki, no location or network needed.{' '}
            <a href={window.location.pathname}>Use real data</a>
          </p>
        )}
        <Header savedCount={saved.length} />
      </div>
      <main>
        <Hero
          status={status}
          error={search.error}
          radiusM={radiusM}
          demo={demo}
          onRadiusChange={setRadiusM}
          onUseLocation={() => search.searchNearMe(radiusM)}
          onSearch={(query) => search.searchNearPlace(query, radiusM)}
        />
        {origin && search.searchId > 0 && (
          <Results
            key={search.searchId}
            ref={resultsRef}
            origin={origin}
            radiusM={search.radiusM}
            cafes={search.cafes}
            source={search.source}
            reviews={reviews}
            savedIds={savedIds}
            onSave={save}
            onUnsave={unsave}
            onAddReview={addReview}
            onDeleteReview={deleteReview}
          />
        )}
        {(saved.length > 0 || origin) && (
          <SavedPanel
            saved={saved}
            origin={origin?.position}
            reviews={reviews}
            onUnsave={unsave}
            onAddReview={addReview}
            onDeleteReview={deleteReview}
          />
        )}
        <footer className="footer">
          Café and map data ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{' '}
          contributors. Missing a café?{' '}
          <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">
            Add it to OpenStreetMap
          </a>
          .
        </footer>
      </main>
    </>
  );
}
