import type { OverpassResponse } from '@coffee-finder/shared';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { demoSource } from './lib/sources';

// Leaflet needs a real browser layout engine, so the map is replaced with a list of markers.
vi.mock('./components/CafeMap', () => ({
  CafeMap: ({
    cafes,
    onSelect,
  }: {
    cafes: { id: string; name: string }[];
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="map">
      {cafes.map((c) => (
        <button key={c.id} type="button" onClick={() => onSelect(c.id)}>
          marker {c.name}
        </button>
      ))}
    </div>
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
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('nominatim')) {
        return new Response(
          JSON.stringify([{ lat: '60.17', lon: '24.94', display_name: 'Kamppi, Helsinki' }]),
        );
      }
      return new Response(JSON.stringify(overpass));
    }),
  );
}

async function searchNearMe() {
  mockGeolocation({ lat: 60.17, lng: 24.9384 });
  await userEvent.click(screen.getByRole('button', { name: /use current location/i }));
  return screen.findByRole('heading', { name: /cafés? within/i });
}

const results = () => screen.getByRole('region', { name: /cafés? within/i });
const savedSection = () => screen.getByRole('region', { name: /saved cafés/i });
const deck = () => screen.getByRole('group', { name: /café cards/i });

describe('App', () => {
  beforeEach(mockFetch);
  afterEach(() => vi.unstubAllGlobals());

  it('shows the landing screen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /the perfect cup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use current location/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: /try it with sample data/i })).toHaveAttribute(
      'href',
      '?demo',
    );
  });

  it('shows the nearest café first in the swipe deck', async () => {
    render(<App />);

    expect(await searchNearMe()).toHaveTextContent('2 cafés within 1.5 km of your location');
    expect(within(deck()).getByRole('article')).toHaveAccessibleName('Andante');
    expect(within(deck()).getByText('2 of 2 left')).toBeInTheDocument();
  });

  it('saves with the right arrow, skips with the left arrow and undoes', async () => {
    render(<App />);
    await searchNearMe();

    deck().focus();
    await userEvent.keyboard('{ArrowRight}');
    // The card animates out first, so wait for the next one to appear.
    await within(deck()).findByRole('article', { name: 'Kaffa Roastery' });
    expect(within(savedSection()).getByRole('heading', { name: 'Andante' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /saved 1/i })).toHaveAttribute('href', '#saved');
    expect(screen.getByText('Saved Andante')).toBeInTheDocument(); // screen reader announcement

    await userEvent.keyboard('{ArrowLeft}');
    expect(await within(deck()).findByText(/that's all 2 cafés/i)).toBeInTheDocument();

    await userEvent.keyboard('{Backspace}');
    await within(deck()).findByRole('article', { name: 'Kaffa Roastery' });
    await userEvent.keyboard('{Control>}z{/Control}');
    await within(deck()).findByRole('article', { name: 'Andante' });
    expect(screen.getByRole('heading', { name: 'Saved cafés (0)' })).toBeInTheDocument();
  });

  it('saves a café when the card is dragged to the right', async () => {
    render(<App />);
    await searchNearMe();
    const card = within(deck()).getByRole('article');

    fireEvent.pointerDown(card, { clientX: 100, pointerType: 'mouse', button: 0 });
    fireEvent.pointerMove(card, { clientX: 180 });
    fireEvent.pointerMove(card, { clientX: 260 });
    fireEvent.pointerUp(card, { clientX: 260 });

    expect(
      await within(savedSection()).findByRole('heading', { name: 'Andante' }),
    ).toBeInTheDocument();
  });

  it('keeps saved cafés after a reload', async () => {
    const { unmount } = render(<App />);
    await searchNearMe();
    await userEvent.click(within(deck()).getByRole('button', { name: 'Save' }));
    await within(savedSection()).findByRole('heading', { name: 'Andante' });

    unmount();
    render(<App />);

    expect(within(savedSection()).getByRole('heading', { name: 'Andante' })).toBeInTheDocument();
    expect(within(savedSection()).getByTestId('map')).toHaveTextContent('marker Andante');
  });

  it('explains what to do when location access is denied', async () => {
    mockGeolocation({ code: 1 });
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /use current location/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/denied.*search/i);
  });

  it('searches around a typed place with the chosen radius', async () => {
    render(<App />);

    await userEvent.selectOptions(screen.getByLabelText(/search within/i), '3000');
    await userEvent.type(screen.getByLabelText(/city or address/i), 'Kamppi{Enter}');

    expect(
      await screen.findByRole('heading', { name: /within 3.0 km of Kamppi, Helsinki/i }),
    ).toBeInTheDocument();
    const overpassCall = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => !String(url).includes('nominatim'));
    expect((overpassCall![1]!.body as URLSearchParams).get('data')).toContain('around:3000');
  });

  it('uses the backup search and says so when the café server is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('nominatim')
          ? new Response(
              JSON.stringify([
                {
                  lat: '60.1701',
                  lon: '24.9385',
                  display_name: 'Andante',
                  name: 'Andante',
                  category: 'amenity',
                  type: 'cafe',
                  osm_type: 'node',
                  osm_id: 2,
                },
              ]),
            )
          : new Response('busy', { status: 504 }),
      ),
    );
    render(<App />);

    expect(await searchNearMe()).toHaveTextContent('1 café within 1.5 km of your location');
    expect(screen.getByRole('status')).toHaveTextContent(/backup search/);
    expect(within(deck()).getByRole('article')).toHaveAccessibleName('Andante');
  });

  it('shows an error when the place is not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]')));
    render(<App />);

    await userEvent.type(screen.getByLabelText(/city or address/i), 'Nowhereville{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('No place called "Nowhereville"');
  });

  it('lists cafés with walking directions in the map view', async () => {
    render(<App />);
    await searchNearMe();
    await userEvent.click(screen.getByRole('button', { name: 'Map & list' }));

    const names = within(results())
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(names).toEqual(['Andante', 'Kaffa Roastery']);
    const card = within(results()).getByRole('heading', { name: 'Andante' }).closest('li')!;
    expect(within(card).getByText('Fredrikinkatu 20')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Directions' })).toHaveAttribute(
      'href',
      expect.stringContaining('destination=60.1701%2C24.9385'),
    );
  });

  it('highlights a café when its map marker is clicked', async () => {
    render(<App />);
    await searchNearMe();
    await userEvent.click(screen.getByRole('button', { name: 'Map & list' }));

    await userEvent.click(within(results()).getByRole('button', { name: 'marker Andante' }));

    const card = within(results()).getByRole('heading', { name: 'Andante' }).closest('li')!;
    expect(card).toHaveClass('is-selected');
  });

  it('saves a review and keeps it after a reload', async () => {
    const { unmount } = render(<App />);
    await searchNearMe();
    await userEvent.click(screen.getByRole('button', { name: 'Map & list' }));

    const card = within(results()).getByRole('heading', { name: 'Andante' }).closest('li')!;
    await userEvent.click(within(card).getByRole('button', { name: /leave a review/i }));
    await userEvent.click(within(card).getByLabelText('4 stars'));
    await userEvent.type(within(card).getByLabelText('Your review'), 'Great flat white');
    await userEvent.click(within(card).getByRole('button', { name: /save review/i }));
    expect(within(card).getByText('4.0 (1)')).toBeInTheDocument();

    unmount();
    render(<App />);
    await searchNearMe();
    await userEvent.click(screen.getByRole('button', { name: 'Map & list' }));
    const reloaded = within(results()).getByRole('heading', { name: 'Andante' }).closest('li')!;
    expect(within(reloaded).getByText('4.0 (1)')).toBeInTheDocument();
  });
});

describe('App in demo mode', () => {
  afterEach(() => vi.useRealTimers());

  it('works without network or location access, and filters by "open now"', async () => {
    // Saturday 23:30 local time: only the 24/7 café and the late-night one are open.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 31, 23, 30));
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(<App source={demoSource} demo />);
    expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /use current location/i }));
    await screen.findByRole('heading', { name: /sample data/i });

    await userEvent.click(screen.getByRole('checkbox', { name: /open now/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Map & list' }));

    const names = within(results())
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(names).toEqual(['Night Owl Espresso', 'Late Shift']);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('marks cafés open or closed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 26, 10, 0)); // Monday 10:00
    render(<App source={demoSource} demo />);
    await act(() => userEvent.click(screen.getByRole('button', { name: /use current location/i })));

    const card = await within(deck()).findByRole('article');
    expect(card).toHaveAccessibleName('Copper Kettle');
    expect(within(card).getByText('Open now')).toBeInTheDocument();
  });
});
