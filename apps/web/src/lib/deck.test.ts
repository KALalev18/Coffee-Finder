import { describe, expect, it } from 'vitest';
import { SWIPE_DISTANCE_PX, remainingCafes, swipeDecision } from './deck';

describe('swipeDecision', () => {
  it('saves or skips once the card passes the threshold', () => {
    expect(swipeDecision(SWIPE_DISTANCE_PX + 1, 0)).toBe('save');
    expect(swipeDecision(-SWIPE_DISTANCE_PX - 1, 0)).toBe('skip');
  });

  it('snaps back for short, slow drags', () => {
    expect(swipeDecision(60, 0.1)).toBeNull();
    expect(swipeDecision(-60, -0.1)).toBeNull();
  });

  it('accepts a short fast flick in the same direction', () => {
    expect(swipeDecision(40, 1)).toBe('save');
    expect(swipeDecision(-40, -1)).toBe('skip');
    // Flicking back against the drag direction cancels it.
    expect(swipeDecision(40, -1)).toBeNull();
    // A tap with a twitch is not a flick.
    expect(swipeDecision(5, 2)).toBeNull();
  });
});

describe('remainingCafes', () => {
  const cafes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('hides decided and already saved cafés, keeping order', () => {
    const history = [{ id: 'a', decision: 'skip' as const }];
    expect(remainingCafes(cafes, history, new Set(['c']))).toEqual([{ id: 'b' }, { id: 'd' }]);
  });

  it('brings a card back once its decision is undone', () => {
    expect(remainingCafes(cafes, [], new Set())).toHaveLength(4);
  });
});
