import { loadList, saveList } from './storage';
import type { Cafe, SavedCafe } from './types';

export const SAVED_KEY = 'velvet-brew:saved';

function isSavedCafe(value: unknown): value is SavedCafe {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  const position = c.position as Record<string, unknown> | undefined;
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.savedAt === 'string' &&
    typeof position?.lat === 'number' &&
    typeof position?.lng === 'number'
  );
}

export const loadSaved = (storage?: Storage) => loadList(SAVED_KEY, isSavedCafe, storage);
export const storeSaved = (cafes: SavedCafe[], storage?: Storage) =>
  saveList(SAVED_KEY, cafes, storage);

/** Keeps only the café's own details; the distance belongs to one search, not to the café. */
export function toSaved(cafe: Cafe, now = new Date()): SavedCafe {
  const { id, name, position, address, openingHours, website } = cafe;
  return { id, name, position, address, openingHours, website, savedAt: now.toISOString() };
}
