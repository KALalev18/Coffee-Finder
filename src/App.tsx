import { useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Results } from './components/Results';
import { useCafeSearch } from './hooks/useCafeSearch';
import { useReviews } from './hooks/useReviews';

export default function App() {
  const { status, origin, cafes, error, searchNearMe, searchNearPlace } = useCafeSearch();
  const { reviews, addReview, deleteReview } = useReviews();
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (status === 'done') resultsRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [status]);

  return (
    <>
      <Header />
      <main>
        <Hero
          status={status}
          error={error}
          onUseLocation={searchNearMe}
          onSearch={searchNearPlace}
        />
        {status === 'done' && origin && (
          <Results
            ref={resultsRef}
            origin={origin}
            cafes={cafes}
            reviews={reviews}
            onAddReview={addReview}
            onDeleteReview={deleteReview}
          />
        )}
      </main>
    </>
  );
}
