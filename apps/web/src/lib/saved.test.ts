import { describe, expect, it } from 'vitest';
import { SAVED_KEY, loadSaved, storeSaved, toSaved } from './saved';

const cafe = {
  id: 'node/1',
  name: 'Andante',
  position: { lat: 60.17, lng: 24.94 },
  address: 'Fredrikinkatu 20',
  distanceM: 120,
};

describe('saved cafés', () => {
  it('stores café details without the search-specific distance', () => {
    const saved = toSaved(cafe, new Date('2026-10-26T10:00:00Z'));
    expect(saved).toEqual({
      id: 'node/1',
      name: 'Andante',
      position: { lat: 60.17, lng: 24.94 },
      address: 'Fredrikinkatu 20',
      openingHours: undefined,
      website: undefined,
      savedAt: '2026-10-26T10:00:00.000Z',
    });
  });

  it('round-trips through storage and drops malformed entries', () => {
    storeSaved([toSaved(cafe)]);
    expect(loadSaved().map((c) => c.id)).toEqual(['node/1']);

    localStorage.setItem(SAVED_KEY, JSON.stringify([{ id: 'x', name: 'No position' }]));
    expect(loadSaved()).toEqual([]);
  });
});
