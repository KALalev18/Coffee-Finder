import { useId, useState, type FormEvent } from 'react';
import { MAX_REVIEW_LENGTH } from '../lib/reviews';
import type { Review } from '../lib/types';
import { StarIcon } from './Icons';
import { Stars } from './Stars';

interface ReviewPanelProps {
  cafeName: string;
  reviews: Review[];
  onAdd: (rating: number, text: string) => void;
  onDelete: (id: string) => void;
}

export function ReviewPanel({ cafeName, reviews, onAdd, onDelete }: ReviewPanelProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const formId = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (rating === 0) return;
    onAdd(rating, text);
    setRating(0);
    setText('');
  }

  return (
    <div className="reviews">
      <form className="review-form" onSubmit={handleSubmit} aria-label={`Review ${cafeName}`}>
        <fieldset className="rating-input">
          <legend>Your rating</legend>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={n <= rating ? 'is-active' : undefined}>
              <input
                type="radio"
                name={`${formId}-rating`}
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="visually-hidden"
              />
              <StarIcon size={22} filled={n <= rating} />
              <span className="visually-hidden">
                {n} star{n > 1 ? 's' : ''}
              </span>
            </label>
          ))}
        </fieldset>
        <label htmlFor={`${formId}-text`} className="visually-hidden">
          Your review
        </label>
        <textarea
          id={`${formId}-text`}
          className="review-form__text"
          placeholder="How was the coffee? (optional)"
          maxLength={MAX_REVIEW_LENGTH}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn--small" disabled={rating === 0}>
          Save review
        </button>
      </form>

      {reviews.length > 0 && (
        <ul className="review-list">
          {reviews.map((r) => (
            <li key={r.id} className="review">
              <div className="review__meta">
                <Stars value={r.rating} size={12} />
                <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString()}</time>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => onDelete(r.id)}
                  aria-label="Delete review"
                >
                  Delete
                </button>
              </div>
              {r.text && <p className="review__text">{r.text}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="reviews__note">Reviews are saved in this browser only.</p>
    </div>
  );
}
