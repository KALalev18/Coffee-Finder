import { useState, type FormEvent } from 'react';
import type { SearchStatus } from '../hooks/useCafeSearch';
import { PinIcon, SearchIcon } from './Icons';

interface HeroProps {
  status: SearchStatus;
  error: string | null;
  onUseLocation: () => void;
  onSearch: (query: string) => void;
}

const STATUS_TEXT: Partial<Record<SearchStatus, string>> = {
  locating: 'Finding your starting point…',
  searching: 'Looking for cafés nearby…',
};

export function Hero({ status, error, onUseLocation, onSearch }: HeroProps) {
  const [query, setQuery] = useState('');
  const busy = status === 'locating' || status === 'searching';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (query.trim()) onSearch(query);
  }

  return (
    <section className="hero" id="top">
      <div className="hero__content">
        <h1 className="hero__title">
          The perfect cup,
          <br />
          close to home.
        </h1>
        <p className="hero__subtitle">
          Great coffee without the travel. Locate your nearest café instantly.
        </p>

        <div className="finder-card">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onUseLocation}
            disabled={busy}
          >
            <PinIcon />
            Use current location
          </button>

          <div className="finder-card__divider">
            <span>or search a place</span>
          </div>

          <form className="search" onSubmit={handleSubmit} role="search">
            <label htmlFor="place-search" className="visually-hidden">
              City or address
            </label>
            <input
              id="place-search"
              type="search"
              className="search__input"
              placeholder="City or address, e.g. Kamppi, Helsinki"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="btn btn--ghost" disabled={busy || !query.trim()}>
              <SearchIcon />
              <span className="visually-hidden">Search</span>
            </button>
          </form>

          <div className="finder-card__status" aria-live="polite">
            {busy && (
              <p className="status">
                <span className="spinner" aria-hidden="true" />
                {STATUS_TEXT[status]}
              </p>
            )}
            {status === 'error' && error && (
              <p className="status status--error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
