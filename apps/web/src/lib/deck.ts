export type Decision = 'save' | 'skip';

export interface DeckEntry {
  id: string;
  decision: Decision;
}

/** How far a card must be dragged before letting go counts as a decision. */
export const SWIPE_DISTANCE_PX = 100;
/** A fast flick counts even if it is short (pixels per millisecond). */
export const FLICK_SPEED = 0.6;
const MIN_FLICK_PX = 20;

/** Decides what a drag that ended at `dx` with horizontal `velocity` means. */
export function swipeDecision(dx: number, velocity: number): Decision | null {
  if (dx > SWIPE_DISTANCE_PX || (velocity > FLICK_SPEED && dx > MIN_FLICK_PX)) return 'save';
  if (dx < -SWIPE_DISTANCE_PX || (velocity < -FLICK_SPEED && dx < -MIN_FLICK_PX)) return 'skip';
  return null;
}

/** Cafés still to be shown: not decided in this deck and not saved earlier. */
export function remainingCafes<T extends { id: string }>(
  cafes: T[],
  history: DeckEntry[],
  savedIds: ReadonlySet<string>,
): T[] {
  const decided = new Set(history.map((entry) => entry.id));
  return cafes.filter((cafe) => !decided.has(cafe.id) && !savedIds.has(cafe.id));
}
