import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const write = (filePath, content) => {
  fs.writeFileSync(path.join(__dirname, filePath), content, 'utf8');
  console.log(`  📄 ${filePath}`);
};

console.log('\n=============================================');
console.log('  🎉 Kampas — Connecting Events Page');
console.log('=============================================\n');

write('src/pages/Events.tsx', `
import { CalendarDays, MapPin, Users, Ticket, Search, X, RefreshCw, CheckCircle, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET, POST } from '../lib/api';

interface Event {
  id: string;
  title: string;
  description: string | null;
  campus: string;
  venue: string | null;
  startDate: string;
  endDate: string | null;
  price: number;
  capacity: number | null;
  image: string | null;
  organizer: { id: string; name: string; avatar: string | null };
  _count: { rsvps: number; tickets: number };
}

interface Ticket {
  id: string;
  eventId: string;
  qrCode: string;
  status: string;
  createdAt: string;
  event: Event;
}

const CAMPUSES = ['All Campuses', 'UoN Main Campus', 'Strathmore', 'JKUAT Main', 'TU Kenya', 'KU Main Campus', 'Mount Kenya Uni'];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
};

const EVENT_IMAGES = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80',
  'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=600&q=80',
];

export default function Events() {
  const { user } = useAuth();

  const [events,        setEvents]        = useState<Event[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [campus,        setCampus]        = useState('All Campuses');
  const [activeTab,     setActiveTab]     = useState<'discover' | 'mytickets'>('discover');
  const [myTickets,     setMyTickets]     = useState<any[]>([]);
  const [ticketsLoading,setTicketsLoading]= useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rsvpd,         setRsvpd]         = useState<Set<string>>(new Set());
  const [purchased,     setPurchased]     = useState<Set<string>>(new Set());
  const [toast,         setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchEvents(); }, [campus]);

  useEffect(() => {
    if (activeTab === 'mytickets') fetchMyTickets();
  }, [activeTab]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '12' });
      if (campus !== 'All Campuses') params.set('campus', campus);
      const res = await GET(\`/api/events?\${params}\`);
      setEvents(res.data.events);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMyTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await GET('/api/buyer/orders'); // tickets stored as event tickets
      // Fetch event tickets specifically
      const ticketRes = await GET('/api/events/my-tickets').catch(() => ({ data: { tickets: [] } }));
      setMyTickets(ticketRes.data?.tickets || []);
    } catch {}
    finally { setTicketsLoading(false); }
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) { showToast('Please log in to RSVP', 'error'); return; }
    setActionLoading(eventId + '-rsvp');
    try {
      const res = await POST(\`/api/events/\${eventId}/rsvp\`, {});
      if (rsvpd.has(eventId)) {
        setRsvpd(prev => { const s = new Set(prev); s.delete(eventId); return s; });
        showToast('RSVP cancelled');
      } else {
        setRsvpd(prev => new Set([...prev, eventId]));
        showToast(\`✅ \${res.message || 'RSVP confirmed!'}\`);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to RSVP', 'error');
    } finally { setActionLoading(null); }
  };

  const handleBuyTicket = async (event: Event) => {
    if (!user) { showToast('Please log in to buy tickets', 'error'); return; }
    if (purchased.has(event.id)) { showToast('You already have a ticket!', 'error'); return; }
    setActionLoading(event.id + '-ticket');
    try {
      const res = await POST(\`/api/events/\${event.id}/ticket\`, {});
      setPurchased(prev => new Set([...prev, event.id]));
      showToast(\`🎟️ Ticket purchased! QR: \${res.data?.ticket?.qrCode}\`);
    } catch (err: any) {
      showToast(err.message || 'Failed to buy ticket', 'error');
    } finally { setActionLoading(null); }
  };

  const filtered = events.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.campus.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">

      {/* Toast */}
      {toast && (
        <div className={\`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all \${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }\`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-pink-50 to-white border-b border-pink-200 px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Campus Events</h1>
          <p className="text-gray-500 text-sm mb-6">Discover events happening across Kenyan campuses.</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {(['discover', 'mytickets'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={\`px-5 py-2 rounded-xl text-sm font-semibold transition-all \${
                  activeTab === t ? 'bg-pink-500 text-white shadow-sm' : 'bg-white border border-pink-200 text-gray-600 hover:border-pink-400'
                }\`}>
                {t === 'discover' ? '🔍 Discover' : '🎟️ My Tickets'}
              </button>
            ))}
          </div>

          {activeTab === 'discover' && (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search events..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white border border-pink-200 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Campus filter */}
              <select value={campus} onChange={e => setCampus(e.target.value)}
                className="bg-white border border-pink-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 text-gray-700">
                {CAMPUSES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">

        {/* ── Discover Tab ─────────────────────────────────────────────── */}
        {activeTab === 'discover' && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-pink-50 rounded-2xl overflow-hidden border border-pink-100 animate-pulse">
                    <div className="h-48 bg-pink-100" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-pink-100 rounded w-3/4" />
                      <div className="h-3 bg-pink-100 rounded w-1/2" />
                      <div className="h-8 bg-pink-100 rounded mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <CalendarDays className="w-12 h-12 text-pink-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">No events found</p>
                <p className="text-gray-400 text-sm mt-1">Try a different campus or search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((event, idx) => {
                  const image       = event.image || EVENT_IMAGES[idx % EVENT_IMAGES.length];
                  const isFree      = event.price === 0;
                  const isRsvpd     = rsvpd.has(event.id);
                  const hasPurchased = purchased.has(event.id);
                  const isLoadingRsvp   = actionLoading === event.id + '-rsvp';
                  const isLoadingTicket = actionLoading === event.id + '-ticket';

                  return (
                    <div key={event.id}
                      className="bg-white border border-pink-100 rounded-2xl overflow-hidden hover:border-pink-300 hover:shadow-lg hover:shadow-pink-50 transition-all group flex flex-col">

                      {/* Image */}
                      <div className="relative h-44 overflow-hidden bg-pink-50">
                        <img src={image} alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                        {/* Price badge */}
                        <div className={\`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold \${
                          isFree ? 'bg-green-500 text-white' : 'bg-pink-500 text-white'
                        }\`}>
                          {isFree ? 'FREE' : \`KSH \${event.price.toLocaleString()}\`}
                        </div>

                        {/* Campus badge */}
                        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-semibold text-gray-700">
                          {event.campus}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-pink-600 transition-colors">
                          {event.title}
                        </h3>

                        <div className="space-y-1.5 mb-4">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <CalendarDays className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                            <span>{formatDate(event.startDate)} • {formatTime(event.startDate)}</span>
                          </div>
                          {event.venue && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <MapPin className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                              <span className="truncate">{event.venue}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Users className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                            <span>{event._count.rsvps} going · {event._count.tickets} tickets sold</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Tag className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                            <span>By {event.organizer.name}</span>
                          </div>
                        </div>

                        {event.description && (
                          <p className="text-xs text-gray-400 line-clamp-2 mb-4">{event.description}</p>
                        )}

                        {/* Actions */}
                        <div className="mt-auto flex gap-2">
                          {/* RSVP button */}
                          <button onClick={() => handleRSVP(event.id)} disabled={!!isLoadingRsvp}
                            className={\`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 \${
                              isRsvpd
                                ? 'bg-pink-100 border-pink-300 text-pink-700'
                                : 'bg-white border-pink-200 text-gray-700 hover:border-pink-400 hover:text-pink-600'
                            }\`}>
                            {isLoadingRsvp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isRsvpd ? '✓ Going' : '+ RSVP'}
                          </button>

                          {/* Ticket button */}
                          <button
                            onClick={() => handleBuyTicket(event)}
                            disabled={!!isLoadingTicket || hasPurchased}
                            className={\`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 \${
                              hasPurchased
                                ? 'bg-green-500 text-white cursor-default'
                                : 'bg-pink-500 text-white hover:bg-pink-600'
                            } disabled:opacity-70\`}>
                            {isLoadingTicket
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              : hasPurchased
                              ? <><CheckCircle className="w-3.5 h-3.5" /> Ticket Got</>
                              : <><Ticket className="w-3.5 h-3.5" /> {isFree ? 'Get Free Ticket' : 'Buy Ticket'}</>
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── My Tickets Tab ────────────────────────────────────────────── */}
        {activeTab === 'mytickets' && (
          <>
            {ticketsLoading ? (
              <div className="text-center py-16 text-gray-400">Loading your tickets...</div>
            ) : myTickets.length === 0 ? (
              <div className="text-center py-20">
                <Ticket className="w-12 h-12 text-pink-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">No tickets yet</p>
                <p className="text-gray-400 text-sm mt-1">Get tickets to upcoming events to see them here.</p>
                <button onClick={() => setActiveTab('discover')}
                  className="mt-4 bg-pink-500 text-white text-sm font-bold px-6 py-2 rounded-xl hover:bg-pink-600 transition-colors">
                  Browse Events
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myTickets.map((ticket: any) => (
                  <div key={ticket.id} className="bg-pink-50 border border-pink-200 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border border-pink-200 flex-shrink-0">
                      <Ticket className="w-7 h-7 text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{ticket.event?.title || 'Event'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ticket.event?.campus}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{ticket.event?.startDate ? formatDate(ticket.event.startDate) : ''}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${
                          ticket.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }\`}>{ticket.status}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{ticket.qrCode}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
`);

console.log('\n=============================================');
console.log('  ✅ Events page connected!');
console.log('');
console.log('  Features:');
console.log('  - Real events from API');
console.log('  - Campus filter');
console.log('  - Search by title/campus');
console.log('  - RSVP toggle (stays green)');
console.log('  - Buy Ticket (deducts from wallet)');
console.log('  - Free vs paid badge');
console.log('  - Attendee count from real data');
console.log('  - My Tickets tab');
console.log('  - Toast notifications');
console.log('  - Loading skeletons');
console.log('=============================================\n');