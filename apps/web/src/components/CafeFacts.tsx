import { formatDistance, walkingMinutes } from '@coffee-finder/shared';
import { googleMapsDirectionsUrl, osmDirectionsUrl } from '../lib/directions';
import { isOpenAt } from '../lib/openingHours';
import type { Cafe, LatLng } from '../lib/types';

export function Distance({ meters }: { meters: number }) {
  return (
    <span className="distance">
      {formatDistance(meters)}
      <small> · {walkingMinutes(meters)} min walk</small>
    </span>
  );
}

/** "Open now" / "Closed now" when the hours are understood; nothing otherwise. */
export function OpenStatus({ hours }: { hours?: string }) {
  const open = isOpenAt(hours, new Date());
  if (open === null) return null;
  return (
    <span className={`badge ${open ? 'badge--open' : 'badge--closed'}`}>
      {open ? 'Open now' : 'Closed now'}
    </span>
  );
}

export function CafeDetails({ cafe }: { cafe: Cafe }) {
  return (
    <>
      {cafe.address && <p className="cafe-line">{cafe.address}</p>}
      {cafe.openingHours && (
        <p className="cafe-line cafe-line--small" title="Opening hours from OpenStreetMap">
          {cafe.openingHours}
        </p>
      )}
    </>
  );
}

export function CafeLinks({ cafe, origin }: { cafe: Cafe; origin?: LatLng }) {
  return (
    <>
      <a
        className="chip chip--primary"
        href={googleMapsDirectionsUrl(origin, cafe.position)}
        target="_blank"
        rel="noreferrer"
      >
        Directions
      </a>
      <a
        className="chip"
        href={osmDirectionsUrl(origin, cafe.position)}
        target="_blank"
        rel="noreferrer"
      >
        OpenStreetMap
      </a>
      {cafe.website && (
        <a className="chip" href={cafe.website} target="_blank" rel="noreferrer">
          Website
        </a>
      )}
    </>
  );
}
