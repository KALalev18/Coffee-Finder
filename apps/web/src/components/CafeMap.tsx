import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { latLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Cafe, LatLng } from '../lib/types';

type MapCafe = Pick<Cafe, 'id' | 'name' | 'position'>;

interface CafeMapProps {
  origin?: LatLng;
  cafes: MapCafe[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Keeps the view in sync with the data: fit all points, then follow the selected café. */
function ViewController({ origin, cafes, selectedId }: Omit<CafeMapProps, 'onSelect'>) {
  const map = useMap();

  useEffect(() => {
    const points = [...(origin ? [origin] : []), ...cafes.map((c) => c.position)];
    if (points.length === 0) return;
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
    else map.fitBounds(latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [32, 32] });
  }, [map, origin, cafes]);

  useEffect(() => {
    const cafe = cafes.find((c) => c.id === selectedId);
    if (cafe) map.flyTo([cafe.position.lat, cafe.position.lng], Math.max(map.getZoom(), 16));
  }, [map, cafes, selectedId]);

  return null;
}

export function CafeMap({ origin, cafes, selectedId, onSelect }: CafeMapProps) {
  const center = origin ?? cafes[0]?.position ?? { lat: 0, lng: 0 };
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      className="map"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ViewController origin={origin} cafes={cafes} selectedId={selectedId} />

      {origin && (
        <CircleMarker
          center={[origin.lat, origin.lng]}
          radius={9}
          pathOptions={{ color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }}
        >
          <Tooltip>Search start</Tooltip>
        </CircleMarker>
      )}

      {cafes.map((cafe) => {
        const selected = cafe.id === selectedId;
        return (
          <CircleMarker
            key={cafe.id}
            center={[cafe.position.lat, cafe.position.lng]}
            radius={selected ? 11 : 7}
            pathOptions={{
              color: '#1a1410',
              weight: 2,
              fillColor: selected ? '#f5d77a' : '#d9b13b',
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelect(cafe.id) }}
          >
            <Tooltip>{cafe.name}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
