import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const makeIcon = (color: string, emoji: string) =>
  L.divIcon({
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"><span style="transform:rotate(45deg);font-size:14px">${emoji}</span></div>`,
    className: '',
    iconSize:    [32, 32],
    iconAnchor:  [16, 32],
    popupAnchor: [0, -36],
  });

const ICONS = {
  product: makeIcon('#ec4899', '🛍️'),
  housing: makeIcon('#8b5cf6', '🏠'),
  event:   makeIcon('#f59e0b', '🎟️'),
  user:    makeIcon('#10b981', '📍'),
};

export interface MapMarker {
  id:       string;
  type:     'product' | 'housing' | 'event' | 'user';
  lat:      number;
  lng:      number;
  title:    string;
  subtitle?: string;
  price?:   number;
  image?:   string;
}

interface MapViewProps {
  center:  [number, number];
  zoom?:   number;
  markers: MapMarker[];
  height?: string;
  onMarkerClick?: (marker: MapMarker) => void;
}

export default function MapView({ center, zoom = 14, markers, height = '400px', onMarkerClick }: MapViewProps) {
  return (
    <div style={{ height, width: '100%' }} className="rounded-2xl overflow-hidden border border-pink-200 shadow-sm">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {markers.map(m => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={ICONS[m.type] || ICONS.product}
            eventHandlers={{ click: () => onMarkerClick?.(m) }}
          >
            <Popup>
              <div className="min-w-[160px]">
                {m.image && (
                  <img src={m.image} alt={m.title} className="w-full h-24 object-cover rounded-lg mb-2" />
                )}
                <p className="font-bold text-sm text-gray-900 leading-tight">{m.title}</p>
                {m.subtitle && <p className="text-xs text-gray-500 mt-0.5">{m.subtitle}</p>}
                {m.price != null && (
                  <p className="text-sm font-bold text-pink-500 mt-1">KSH {m.price.toLocaleString()}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
