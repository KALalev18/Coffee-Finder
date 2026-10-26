import { formatDistance } from '@coffee-finder/shared';
import { useState, type FormEvent } from 'react';
import type { SearchStatus } from '../hooks/useCafeSearch';
import { RADIUS_OPTIONS_M } from '../lib/config';
import { PinIcon, SearchIcon } from './Icons';

interface HeroProps {
  status: SearchStatus;
  error: string | null;
  radiusM: number;
  demo: boolean;
  onRadiusChange: (radiusM: number) => void;
  onUseLocation: () => void;
  onSearch: (query: string) => void;
}

const STATUS_TEXT: Partial<Record<SearchStatus, string>> = {
  locating: 'Finding your starting point…',
  searching: 'Looking for cafés nearby…',
};

export function Hero({
  status,
  error,
  radiusM,
  demo,
  onRadiusChange,
  onUseLocation,
  onSearch,
}: HeroProps) {
  const [query, setQuery] = useState('');
  const busy = status === 'locating' || status === 'searching';
  const radiusOptions = RADIUS_OPTIONS_M.includes(radiusM)
    ? RADIUS_OPTIONS_M
    : [...RADIUS_OPTIONS_M, radiusM].sort((a, b) => a - b);

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
          Swipe through cafés near you, save the ones you like, and see them on a map.
        </p>

        <div className="finder-card">
          <label className="radius">
            Search within
            <select
              value={radiusM}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              disabled={busy}
            >
              {radiusOptions.map((m) => (
                <option key={m} value={m}>
                  {formatDistance(m)}
                </option>
              ))}
            </select>
          </label>

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

          {!demo && (
            <a className="finder-card__demo" href="?demo">
              No location handy? Try it with sample data
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
