import { StarIcon } from './Icons';

interface StarsProps {
  value: number;
  size?: number;
}

/** Read-only star display; value is rounded to the nearest whole star. */
export function Stars({ value, size = 14 }: StarsProps) {
  const rounded = Math.round(value);
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} filled={n <= rounded} />
      ))}
    </span>
  );
}
