import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { OverpassResponse } from './lib/overpass';

// Leaflet needs a real browser layout engine, so the map is replaced in these tests.
vi.mock('./components/CafeMap', () => ({
  CafeMap: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button type="button" onClick={() => onSelect('node/2')}>
      fake map marker
    </button>
  ),
}));

const overpass: OverpassResponse = {
  elements: [
    { type: 'node', id: 1, lat: 60.175, lon: 24.94, tags: { name: 'Kaffa Roastery' } },
    {
      type: 'node',
      id: 2,
      lat: 60.1701,
      lon: 24.9385,
      tags: { name: 'Andante', 'addr:street': 'Fredrikinkatu', 'addr:housenumber': '20' },
    },
  ],
};

function mockGeolocation(result: { lat: number; lng: number } | { code: number }) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback, fail: PositionErrorCallback) =>
        'code' in result
          ? fail({ code: result.code } as GeolocationPositionError)
          : ok({ coords: { latitude: result.lat, longitude: result.lng } } as GeolocationPosition),
    },
  });
}

function mockFetch() {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes('nominatim')) {
      return new Response(
        JSON.stringify([{ lat: '60.17', lon: '24.94', display_name: 'Kamppi, Helsinki' }]),
      );
    }
    return new Response(JSON.stringify(overpass));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('App', () => {
  beforeEach(() => {
    mockFetch();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the landing screen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /the perfect cup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use current location/i })).toBeEnabled();
  });

  it('lists cafés near the device location, nearest first', async () => {
    mockGeolocation({ lat: 60.17, lng: 24.9384 });
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /use current location/i }));

    expect(
      await screen.findByRole('heading', { name: /2 cafés within 1.5 km of your location/i }),
    ).toBeInTheDocument();
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Andante', 'Kaffa Roastery']);
    expect(screen.getByText('Fredrikinkatu 20')).toBeInTheDocument();
  });

  it('explains what to do when location access is denied', async () => {
    mockGeolocation({ code: 1 });
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /use current location/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/denied.*search/i);
  });

  it('searches around a typed place', async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/city or address/i), 'Kamppi{Enter}');

    expect(
      await screen.findByRole('heading', { name: /of Kamppi, Helsinki/i }),
    ).toBeInTheDocument();
  });

  it('shows an error when the place is not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]')));
    render(<App />);

    await userEvent.type(screen.getByLabelText(/city or address/i), 'Nowhereville{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('No place called "Nowhereville"');
  });

  it('links to walking directions', async () => {
    mockGeolocation({ lat: 60.17, lng: 24.9384 });
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /use current location/i }));

    const card = (await screen.findByRole('heading', { name: 'Andante' })).closest('li')!;
    const link = within(card).getByRole('link', { name: 'Directions' });
    expect(link).toHaveAttribute('href', expect.stringContaining('destination=60.1701%2C24.9385'));
  });

  it('saves a review and keeps it after a reload', async () => {
    mockGeolocation({ lat: 60.17, lng: 24.9384 });
    const { unmount } = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /use current location/i }));

    const card = (await screen.findByRole('heading', { name: 'Andante' })).closest('li')!;
    await userEvent.click(within(card).getByRole('button', { name: /leave a review/i }));
    await userEvent.click(within(card).getByLabelText('4 stars'));
    await userEvent.type(within(card).getByLabelText('Your review'), 'Great flat white');
    await userEvent.click(within(card).getByRole('button', { name: /save review/i }));

    expect(within(card).getByText('Great flat white')).toBeInTheDocument();
    expect(within(card).getByText('4.0 (1)')).toBeInTheDocument();

    unmount();
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /use current location/i }));
    const reloaded = (await screen.findByRole('heading', { name: 'Andante' })).closest('li')!;
    expect(within(reloaded).getByText('4.0 (1)')).toBeInTheDocument();
  });

  it('highlights a café when its map marker is clicked', async () => {
    mockGeolocation({ lat: 60.17, lng: 24.9384 });
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /use current location/i }));

    await userEvent.click(await screen.findByRole('button', { name: 'fake map marker' }));

    const card = screen.getByRole('heading', { name: 'Andante' }).closest('li')!;
    expect(card).toHaveClass('is-selected');
  });
});
