import { useState, useEffect } from 'react';
import { MapPin, Package, Home, Calendar, Sparkles, RefreshCw } from 'lucide-react';
import MapView, { MapMarker } from '../components/MapView';
import { GET } from '../lib/api';
import { useLocation2 } from '../context/LocationContext';
import { getRecommendations } from '../lib/recommendations';

type LayerType = 'all' | 'products' | 'housing' | 'events';

const CAMPUS_CENTERS: Record<string, [number, number]> = {
  'UoN Main Campus':    [-1.2792, 36.8167],
  'Strathmore':         [-1.3100, 36.8120],
  'JKUAT Main':         [-1.0895, 37.0122],
  'KU Main Campus':     [-1.1756, 36.9356],
  'Mount Kenya Uni':    [-0.4195, 36.9536],
  'TU Kenya':           [-0.3031, 36.0800],
};

const CAMPUSES = Object.keys(CAMPUS_CENTERS);

function jitter(val: number): number {
  return val + (Math.random() - 0.5) * 0.008;
}

export default function CampusMap() {
  const { campus, setCampus } = useLocation2();

  const [markers,       setMarkers]       = useState<MapMarker[]>([]);
  const [layer,         setLayer]         = useState<LayerType>('all');
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState<MapMarker | null>(null);
  const [products,      setProducts]      = useState<any[]>([]);
  const [recommendations, setRecs]        = useState<any[]>([]);

  const center: [number, number] = CAMPUS_CENTERS[campus] || [-1.2792, 36.8167];

  useEffect(() => { fetchAll(); }, [campus]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [prodRes, housingRes, eventsRes] = await Promise.allSettled([
        GET(`/api/products?limit=20&campus=${encodeURIComponent(campus)}`),
        GET(`/api/housing?limit=10&campus=${encodeURIComponent(campus)}`),
        GET(`/api/events?limit=10&campus=${encodeURIComponent(campus)}`),
      ]);

      const allMarkers: MapMarker[] = [];

      if (prodRes.status === 'fulfilled') {
        const prods = prodRes.value.data?.products || [];
        setProducts(prods);
        prods.forEach((p: any) => {
          allMarkers.push({
            id: p.id,
            type: 'product',
            lat: jitter(center[0]),
            lng: jitter(center[1]),
            title: p.title,
            subtitle: p.seller?.name,
            price: p.price,
            image: p.images?.find((i: any) => i.isPrimary)?.url || p.images?.[0]?.url,
          });
        });

        const recs = getRecommendations(prods, campus, ['tech-gadgets', 'sneakers-drip', 'electronics'], undefined, 4);
        setRecs(recs);
      }

      if (housingRes.status === 'fulfilled') {
        const housings = housingRes.value.data?.housings || [];
        housings.forEach((h: any) => {
          allMarkers.push({
            id: `h-${h.id}`,
            type: 'housing',
            lat: h.latitude || jitter(center[0]),
            lng: h.longitude || jitter(center[1]),
            title: h.title,
            subtitle: h.hostelName,
            price: h.price,
            image: h.images?.[0]?.url,
          });
        });
      }

      if (eventsRes.status === 'fulfilled') {
        const events = eventsRes.value.data?.events || [];
        events.forEach((e: any) => {
          allMarkers.push({
            id: `e-${e.id}`,
            type: 'event',
            lat: jitter(center[0]),
            lng: jitter(center[1]),
            title: e.title,
            subtitle: e.venue,
            price: e.price,
            image: e.image,
          });
        });
      }

      setMarkers(allMarkers);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredMarkers = markers.filter(m => {
    if (layer === 'all') return true;
    if (layer === 'products') return m.type === 'product';
    if (layer === 'housing')  return m.type === 'housing';
    if (layer === 'events')   return m.type === 'event';
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-pink-500" /> Campus Map
        </h1>
        <p className="text-sm text-gray-500 mt-1">Discover products, housing & events near you</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={campus}
          onChange={e => setCampus(e.target.value)}
          className="bg-pink-50 border border-pink-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500"
        >
          {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex gap-2 flex-wrap">
          {([['all','All','🗺️'],['products','Products','🛍️'],['housing','Housing','🏠'],['events','Events','🎟️']] as [LayerType,string,string][]).map(([v,l,icon]) => (
            <button key={v} onClick={() => setLayer(v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${layer === v ? 'bg-pink-500 text-white border-pink-500' : 'bg-white border-pink-200 text-gray-600 hover:border-pink-400'}`}>
              {icon} {l}
            </button>
          ))}
        </div>

        <button onClick={fetchAll} disabled={loading}
          className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-pink-200 text-gray-600 hover:border-pink-400 transition-all disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-pink-500 inline-block"></span>Products ({markers.filter(m=>m.type==='product').length})</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>Housing ({markers.filter(m=>m.type==='housing').length})</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>Events ({markers.filter(m=>m.type==='event').length})</span>
      </div>

      {loading ? (
        <div className="h-96 bg-pink-50 rounded-2xl border border-pink-200 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-pink-400 animate-spin" />
        </div>
      ) : (
        <MapView
          center={center}
          zoom={15}
          markers={filteredMarkers}
          height="480px"
          onMarkerClick={setSelected}
        />
      )}

      {/* Selected marker card */}
      {selected && (
        <div className="mt-4 bg-white border border-pink-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          {selected.image && (
            <img src={selected.image} alt={selected.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-pink-100" />
          )}
          <div className="flex-1 min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mr-2 ${
              selected.type === 'product' ? 'bg-pink-100 text-pink-700' :
              selected.type === 'housing' ? 'bg-purple-100 text-purple-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>{selected.type}</span>
            <h3 className="font-bold text-gray-900 mt-1">{selected.title}</h3>
            {selected.subtitle && <p className="text-xs text-gray-500 mt-0.5">{selected.subtitle}</p>}
          </div>
          {selected.price != null && (
            <span className="font-black text-pink-500 text-lg flex-shrink-0">
              {selected.price === 0 ? 'FREE' : `KSH ${selected.price.toLocaleString()}`}
            </span>
          )}
          <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 text-lg flex-shrink-0">×</button>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-pink-500" />
            <h2 className="font-bold text-gray-900">Recommended Near {campus}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recommendations.map(({ item, reason }) => {
              const img = (item as any).images?.find((i: any) => i.isPrimary)?.url || (item as any).images?.[0]?.url;
              return (
                <div key={item.id} className="bg-pink-50 border border-pink-200 rounded-2xl overflow-hidden group hover:border-pink-400 transition-all">
                  {img && <img src={img} alt={item.title} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-500" />}
                  <div className="p-3">
                    <p className="text-[10px] text-pink-500 font-bold mb-0.5">{reason}</p>
                    <h4 className="font-semibold text-xs text-gray-900 line-clamp-2">{item.title}</h4>
                    {item.price != null && <p className="font-bold text-pink-500 text-sm mt-1">KSH {item.price.toLocaleString()}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
