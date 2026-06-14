import React, { useState, useEffect } from 'react';
import { Home, MapPin, ChevronLeft, ChevronRight, Star, Wifi, Car, Droplets, Zap, Search, RefreshCw, Heart, Sparkles } from 'lucide-react';
import { GET } from '../lib/api';
import { useLocation2 } from '../context/LocationContext';
import MapView, { MapMarker } from '../components/MapView';

interface HousingImage { url: string; }

interface HousingItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  campus: string;
  hostelName: string | null;
  roomType: string | null;
  amenities: string | null;
  latitude: number | null;
  longitude: number | null;
  images: HousingImage[];
  isAvailable: boolean;
  owner: { id: string; name: string; avatar: string | null };
  _count?: { saves: number };
}

const CAMPUSES = ['All Campuses','UoN Main Campus','Strathmore','JKUAT Main','TU Kenya','KU Main Campus','Mount Kenya Uni'];

const CAMPUS_CENTERS: Record<string, [number, number]> = {
  'UoN Main Campus': [-1.2792, 36.8167],
  'Strathmore':      [-1.3100, 36.8120],
  'JKUAT Main':      [-1.0895, 37.0122],
  'KU Main Campus':  [-1.1756, 36.9356],
  'Mount Kenya Uni': [-0.4195, 36.9536],
  'TU Kenya':        [-0.3031, 36.0800],
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi:      <Wifi className="w-3 h-3" />,
  parking:   <Car className="w-3 h-3" />,
  water:     <Droplets className="w-3 h-3" />,
  electricity:<Zap className="w-3 h-3" />,
};

function ImageCarousel({ images }: { images: HousingImage[] }) {
  const [idx, setIdx] = useState(0);
  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-pink-50 flex items-center justify-center rounded-t-2xl">
        <Home className="w-10 h-10 text-pink-200" />
      </div>
    );
  }
  return (
    <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-pink-50">
      <img
        src={images[idx]?.url}
        alt="Room"
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white scale-110' : 'bg-white/50'}`} />
            ))}
          </div>
          <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {idx + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function Housing() {
  const { campus: userCampus } = useLocation2();
  const [housings,  setHousings]  = useState<HousingItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [campus,    setCampus]    = useState('All Campuses');
  const [search,    setSearch]    = useState('');
  const [showMap,   setShowMap]   = useState(false);
  const [savedIds,  setSavedIds]  = useState<Set<string>>(new Set());

  useEffect(() => { fetchHousings(); }, [campus]);

  const fetchHousings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (campus !== 'All Campuses') params.set('campus', campus);
      const res = await GET(`/api/housing?${params}`);
      setHousings(res.data?.housings || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleSave = (id: string) => {
    setSavedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filtered = housings.filter(h =>
    !search ||
    h.title.toLowerCase().includes(search.toLowerCase()) ||
    h.hostelName?.toLowerCase().includes(search.toLowerCase()) ||
    h.campus.toLowerCase().includes(search.toLowerCase())
  );

  const activeCampus = campus !== 'All Campuses' ? campus : userCampus;
  const mapCenter: [number, number] = CAMPUS_CENTERS[activeCampus] || [-1.2792, 36.8167];

  const mapMarkers: MapMarker[] = filtered.map(h => ({
    id: h.id,
    type: 'housing' as const,
    lat: h.latitude || mapCenter[0] + (Math.random() - 0.5) * 0.008,
    lng: h.longitude || mapCenter[1] + (Math.random() - 0.5) * 0.008,
    title: h.title,
    subtitle: h.hostelName || h.roomType || '',
    price: h.price,
    image: h.images?.[0]?.url,
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-pink-100 px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search hostels, rooms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-pink-50 border border-pink-200 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-pink-500"
            />
          </div>
          <button
            onClick={() => setShowMap(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all flex-shrink-0 ${showMap ? 'bg-purple-500 text-white border-purple-500' : 'bg-pink-50 border-pink-200 text-gray-700'}`}
          >
            <MapPin className="w-4 h-4" /> Map
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CAMPUSES.map(c => (
            <button key={c} onClick={() => setCampus(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${campus === c ? 'bg-pink-500 text-white border-pink-500' : 'bg-pink-50 border-pink-200 text-gray-600 hover:border-pink-400'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Home className="w-5 h-5 text-purple-500" /> Campus Housing
            </h1>
            <p className="text-xs text-gray-400">{loading ? 'Loading...' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''}`}</p>
          </div>
          {userCampus && <span className="text-xs text-purple-600 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" />{userCampus}</span>}
        </div>
      </div>

      {/* Map view */}
      {showMap && (
        <div className="px-4 pb-4">
          <MapView center={mapCenter} zoom={15} markers={mapMarkers} height="320px" />
        </div>
      )}

      {/* Listings */}
      <div className="px-4 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length:6}).map((_,i) => (
              <div key={i} className="bg-pink-50 rounded-2xl overflow-hidden border border-pink-100 animate-pulse">
                <div className="aspect-video bg-pink-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-pink-100 rounded w-3/4" />
                  <div className="h-3 bg-pink-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Home className="w-12 h-12 text-pink-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No listings found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different campus or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(h => {
              const amenities = h.amenities ? h.amenities.split(',').map(a => a.trim().toLowerCase()) : [];
              const isSaved   = savedIds.has(h.id);
              return (
                <div key={h.id} className="bg-white rounded-2xl overflow-hidden border border-pink-100 hover:border-pink-300 transition-all shadow-sm hover:shadow-md group">
                  <div className="relative">
                    <ImageCarousel images={h.images} />
                    <button
                      onClick={() => toggleSave(h.id)}
                      className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all ${isSaved ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white/80 border-white/50 text-gray-500 hover:text-pink-500'}`}
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                    {!h.isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full">Not Available</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-purple-600 transition-colors">{h.title}</h3>
                      <span className="font-black text-purple-500 text-sm flex-shrink-0">KSH {h.price.toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></span>
                    </div>

                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                      <MapPin className="w-3 h-3 text-purple-400 flex-shrink-0" />
                      <span className="truncate">{h.hostelName ? `${h.hostelName} · ` : ''}{h.campus}</span>
                    </div>

                    {h.roomType && (
                      <span className="text-[10px] font-semibold bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full">{h.roomType}</span>
                    )}

                    {amenities.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {amenities.slice(0,4).map(a => (
                          <span key={a} className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md">
                            {AMENITY_ICONS[a] || null}{a}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-pink-50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={h.owner.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${h.owner.name}`}
                          className="w-5 h-5 rounded-full border border-pink-100"
                        />
                        <span className="text-xs text-gray-500 truncate max-w-[80px]">{h.owner.name}</span>
                      </div>
                      <button className="bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-purple-600 transition-colors">
                        Enquire
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
