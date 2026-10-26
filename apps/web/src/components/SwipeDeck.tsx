import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { remainingCafes, swipeDecision, type Decision, type DeckEntry } from '../lib/deck';
import type { Cafe, LatLng, NearbyCafe } from '../lib/types';
import { CafeDetails, CafeLinks, Distance, OpenStatus } from './CafeFacts';

const LEAVE_MS = 220;
/** A pause this long before letting go means the finger stopped, so it is not a flick. */
const FLICK_WINDOW_MS = 100;

interface SwipeDeckProps {
  cafes: NearbyCafe[];
  origin: LatLng;
  savedIds: ReadonlySet<string>;
  onSave: (cafe: Cafe) => void;
  onUnsave: (id: string) => void;
}

interface Drag {
  startX: number;
  lastX: number;
  lastTime: number;
  velocity: number;
}

function CardBody({ cafe, origin }: { cafe: NearbyCafe; origin: LatLng }) {
  return (
    <>
      <div className="swipe-card__head">
        <h3 className="swipe-card__name">{cafe.name}</h3>
        <Distance meters={cafe.distanceM} />
      </div>
      <OpenStatus hours={cafe.openingHours} />
      <CafeDetails cafe={cafe} />
      <div className="swipe-card__links">
        <CafeLinks cafe={cafe} origin={origin} />
      </div>
    </>
  );
}

/**
 * One café at a time: drag right (or press →) to save, left (or ←) to skip,
 * and undo the last decision with the Undo button, Backspace or Ctrl/⌘+Z.
 *
 * The drag offset is written straight to a CSS custom property instead of React
 * state, so moving a finger doesn't re-render the component on every pointer event.
 */
export function SwipeDeck({ cafes, origin, savedIds, onSave, onUnsave }: SwipeDeckProps) {
  const [history, setHistory] = useState<DeckEntry[]>([]);
  const [leaving, setLeaving] = useState<Decision | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const reducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const drag = useRef<Drag | null>(null);

  const remaining = remainingCafes(cafes, history, savedIds);
  const [current, next] = remaining;

  function setOffset(dx: number) {
    cardRef.current?.style.setProperty('--drag', String(dx));
  }

  function decide(decision: Decision) {
    if (!current || leaving) return;
    const finish = () => {
      setLeaving(null);
      setHistory((h) => [...h, { id: current.id, decision }]);
      if (decision === 'save') onSave(current);
      setAnnouncement(`${decision === 'save' ? 'Saved' : 'Skipped'} ${current.name}`);
    };
    if (reducedMotion) {
      finish();
      return;
    }
    setLeaving(decision);
    setOffset(decision === 'save' ? 600 : -600);
    window.setTimeout(finish, LEAVE_MS);
  }

  function undo() {
    const last = history.at(-1);
    if (!last || leaving) return;
    setHistory((h) => h.slice(0, -1));
    if (last.decision === 'save') onUnsave(last.id);
    const name = cafes.find((c) => c.id === last.id)?.name ?? 'the last café';
    setAnnouncement(`Undid ${last.decision === 'save' ? 'saving' : 'skipping'} ${name}`);
  }

  function handleKeyDown(event: KeyboardEvent) {
    const isUndo =
      event.key === 'Backspace' || ((event.ctrlKey || event.metaKey) && event.key === 'z');
    if (event.key === 'ArrowRight') decide('save');
    else if (event.key === 'ArrowLeft') decide('skip');
    else if (isUndo) undo();
    else return;
    event.preventDefault();
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (leaving || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // Let links and buttons on the card work normally.
    if ((event.target as Element).closest('a, button')) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    };
    event.currentTarget.classList.add('is-dragging');
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const dt = event.timeStamp - d.lastTime;
    if (dt > 0) d.velocity = (event.clientX - d.lastX) / dt;
    d.lastX = event.clientX;
    d.lastTime = event.timeStamp;
    setOffset(event.clientX - d.startX);
  }

  function handlePointerEnd(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    event.currentTarget.classList.remove('is-dragging');
    const stopped = event.timeStamp - d.lastTime > FLICK_WINDOW_MS;
    const decision =
      event.type === 'pointerup'
        ? swipeDecision(event.clientX - d.startX, stopped ? 0 : d.velocity)
        : null;
    if (decision) decide(decision);
    else setOffset(0);
  }

  return (
    <div
      className="deck"
      role="group"
      aria-label="Café cards. Press the right arrow to save, left arrow to skip, Backspace to undo."
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {current ? (
        <>
          <p className="deck__count muted">
            {remaining.length} of {cafes.length} left
          </p>
          <div className="deck__stack">
            {next && (
              // Only a preview with nothing focusable, so keyboard users never land on it.
              <div className="swipe-card swipe-card--next" aria-hidden="true">
                <div className="swipe-card__head">
                  <span className="swipe-card__name">{next.name}</span>
                  <Distance meters={next.distanceM} />
                </div>
              </div>
            )}
            <article
              key={current.id}
              ref={cardRef}
              className={`swipe-card${leaving ? ' is-leaving' : ''}`}
              aria-label={current.name}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              <span className="swipe-card__stamp swipe-card__stamp--save" aria-hidden="true">
                Save
              </span>
              <span className="swipe-card__stamp swipe-card__stamp--skip" aria-hidden="true">
                Skip
              </span>
              <CardBody cafe={current} origin={origin} />
            </article>
          </div>
        </>
      ) : (
        <div className="deck__done">
          <p>
            {cafes.length === 0
              ? 'No cafés match these filters.'
              : `That's all ${cafes.length} café${cafes.length === 1 ? '' : 's'}.`}
          </p>
          {history.length > 0 && (
            <button type="button" className="chip" onClick={() => setHistory([])}>
              Start over
            </button>
          )}
        </div>
      )}

      <div className="deck__controls">
        <button
          type="button"
          className="round-btn round-btn--skip"
          onClick={() => decide('skip')}
          disabled={!current}
          aria-keyshortcuts="ArrowLeft"
        >
          Skip
        </button>
        <button
          type="button"
          className="round-btn"
          onClick={undo}
          disabled={history.length === 0}
          aria-keyshortcuts="Backspace Control+Z"
        >
          Undo
        </button>
        <button
          type="button"
          className="round-btn round-btn--save"
          onClick={() => decide('save')}
          disabled={!current}
          aria-keyshortcuts="ArrowRight"
        >
          Save
        </button>
      </div>
      <p className="deck__hint muted">Drag the card, or use ← → and Backspace.</p>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
