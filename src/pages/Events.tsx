
import { CalendarDays, MapPin, Users, Ticket, Search, X, RefreshCw, CheckCircle, Tag, Wallet, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET, POST } from '../lib/api';
import TicketCard from '../components/Ticket';

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

const CAMPUSES = [
  'All Campuses',
  'University of Nairobi - Main Campus',
  'Strathmore University',
  'JKUAT - Main Campus (Juja)',
  'Kenyatta University - Main Campus',
  'Technical University of Kenya - Main (Nairobi)',
  'Mount Kenya University - Thika',
  'Moi University - Main Campus (Eldoret)',
  'Maseno University',
  'Egerton University - Main Campus',
  'USIU-Africa (United States International University)',
  'Daystar University - Nairobi',
];

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80',
  'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=600&q=80',
];

export default function Events() {
  const { user, refresh } = useAuth();

  const [events,         setEvents]         = useState<Event[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [campus,         setCampus]         = useState('All Campuses');
  const [activeTab,      setActiveTab]      = useState<'discover'|'mytickets'>('discover');
  const [myTickets,      setMyTickets]      = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [actionLoading,  setActionLoading]  = useState<string|null>(null);
  const [rsvpd,          setRsvpd]          = useState<Set<string>>(new Set());
  const [purchased,      setPurchased]      = useState<Set<string>>(new Set());
  const [toast,          setToast]          = useState<{msg:string; type:'success'|'error'}|null>(null);

  // Confirmation modal state
  const [confirmEvent,   setConfirmEvent]   = useState<Event|null>(null);

  useEffect(() => { fetchEvents(); }, [campus]);
  useEffect(() => { if (activeTab === 'mytickets') fetchMyTickets(); }, [activeTab]);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '12' });
      if (campus !== 'All Campuses') params.set('campus', campus);
      const res = await GET(`/api/events?${params}`);
      setEvents(res.data.events);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMyTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await GET('/api/events/my/tickets');
      setMyTickets(res.data.tickets || []);
    } catch (e) { console.error(e); }
    finally { setTicketsLoading(false); }
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) { showToast('Please log in to RSVP', 'error'); return; }
    setActionLoading(eventId + '-rsvp');
    try {
      await POST(`/api/events/${eventId}/rsvp`, {});
      setRsvpd(prev => {
        const s = new Set(prev);
        prev.has(eventId) ? s.delete(eventId) : s.add(eventId);
        return s;
      });
      showToast(rsvpd.has(eventId) ? 'RSVP cancelled' : '✅ RSVP confirmed!');
    } catch (err: any) {
      showToast(err.message || 'Failed to RSVP', 'error');
    } finally { setActionLoading(null); }
  };

  // Step 1 — show confirmation modal
  const handleTicketClick = (event: Event) => {
    if (!user) { showToast('Please log in to buy tickets', 'error'); return; }
    if (purchased.has(event.id)) { showToast('You already have a ticket for this event!', 'error'); return; }
    setConfirmEvent(event);
  };

  // Step 2 — actual purchase after confirmation
  const confirmPurchase = async () => {
    if (!confirmEvent) return;
    const event = confirmEvent;
    setConfirmEvent(null);

    // Check wallet balance before even calling API
    if (event.price > 0 && (user?.walletBalance ?? 0) < event.price) {
      showToast(`Insufficient balance. You need KSH ${event.price.toLocaleString()} but have KSH ${(user?.walletBalance ?? 0).toLocaleString()}`, 'error');
      return;
    }

    setActionLoading(event.id + '-ticket');
    try {
      const res = await POST(`/api/events/${event.id}/ticket`, {});
      // Mark as purchased permanently
      setPurchased(prev => new Set([...prev, event.id]));
      // Refresh user wallet balance in context
      await refresh();
      const qr = res.data?.ticket?.qrCode;
      showToast(
        event.price === 0
          ? `🎟️ Free ticket confirmed! QR: ${qr}`
          : `🎟️ Ticket purchased! KSH ${event.price.toLocaleString()} deducted. QR: ${qr}`
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to buy ticket', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = events.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.campus.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-start gap-2 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmEvent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Confirm Purchase</h3>
              <button onClick={() => setConfirmEvent(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-5">
              <p className="font-semibold text-gray-900 mb-1">{confirmEvent.title}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <CalendarDays className="w-3 h-3" /> {formatDate(confirmEvent.startDate)}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {confirmEvent.venue || confirmEvent.campus}
              </p>
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Ticket Price</span>
                <span className="font-semibold">{confirmEvent.price === 0 ? 'FREE' : `KSH ${confirmEvent.price.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> Your Wallet</span>
                <span className={`font-semibold ${
                  (user?.walletBalance ?? 0) >= confirmEvent.price ? 'text-green-600' : 'text-red-500'
                }`}>
                  KSH {(user?.walletBalance ?? 0).toLocaleString()}
                </span>
              </div>
              {confirmEvent.price > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Balance after purchase</span>
                  <span className="font-semibold">
                    KSH {Math.max(0, (user?.walletBalance ?? 0) - confirmEvent.price).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Insufficient balance warning */}
            {confirmEvent.price > 0 && (user?.walletBalance ?? 0) < confirmEvent.price && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Insufficient balance. Top up KSH {(confirmEvent.price - (user?.walletBalance ?? 0)).toLocaleString()} in your dashboard.</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setConfirmEvent(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                disabled={confirmEvent.price > 0 && (user?.walletBalance ?? 0) < confirmEvent.price}
                className="flex-1 py-2.5 rounded-xl bg-pink-500 text-white text-sm font-bold hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Ticket className="w-4 h-4" />
                {confirmEvent.price === 0 ? 'Get Free Ticket' : `Pay KSH ${confirmEvent.price.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="bg-gradient-to-br from-pink-50 to-white border-b border-pink-200 px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Campus Events</h1>
          <p className="text-gray-500 text-sm mb-6">Discover events happening across Kenyan campuses.</p>

          <div className="flex gap-2 mb-5">
            {(['discover','mytickets'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === t ? 'bg-pink-500 text-white shadow-sm' : 'bg-white border border-pink-200 text-gray-600 hover:border-pink-400'
                }`}>
                {t === 'discover' ? '🔍 Discover' : '🎟️ My Tickets'}
              </button>
            ))}
          </div>

          {activeTab === 'discover' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search events..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white border border-pink-200 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-pink-500" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <select value={campus} onChange={e => setCampus(e.target.value)}
                className="bg-white border border-pink-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 text-gray-700">
                {CAMPUSES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">

        {/* Discover tab */}
        {activeTab === 'discover' && (
          loading ? (
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
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((event, idx) => {
                const image      = event.image || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
                const isFree     = event.price === 0;
                const isRsvpd    = rsvpd.has(event.id);
                const hasPurchased = purchased.has(event.id);
                const isLoadingRsvp   = actionLoading === event.id + '-rsvp';
                const isLoadingTicket = actionLoading === event.id + '-ticket';
                const canAfford  = isFree || (user?.walletBalance ?? 0) >= event.price;

                return (
                  <div key={event.id}
                    className="bg-white border border-pink-100 rounded-2xl overflow-hidden hover:border-pink-300 hover:shadow-lg hover:shadow-pink-50 transition-all group flex flex-col">

                    <div className="relative h-44 overflow-hidden bg-pink-50">
                      <img src={image} alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold ${isFree ? 'bg-green-500 text-white' : 'bg-pink-500 text-white'}`}>
                        {isFree ? 'FREE' : `KSH ${event.price.toLocaleString()}`}
                      </div>
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-semibold text-gray-700">
                        {event.campus}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-pink-600 transition-colors">
                        {event.title}
                      </h3>
                      <div className="space-y-1.5 mb-4 text-xs text-gray-500">
                        <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />{formatDate(event.startDate)} • {formatTime(event.startDate)}</div>
                        {event.venue && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" /><span className="truncate">{event.venue}</span></div>}
                        <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />{event._count.rsvps} going · {event._count.tickets} tickets sold</div>
                        <div className="flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />By {event.organizer.name}</div>
                      </div>

                      {/* Wallet warning for paid events */}
                      {!isFree && !hasPurchased && !canAfford && (
                        <div className="flex items-center gap-1.5 text-[11px] text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 mb-3">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Insufficient balance — top up KSH {(event.price - (user?.walletBalance ?? 0)).toLocaleString()} more
                        </div>
                      )}

                      <div className="mt-auto flex gap-2">
                        <button onClick={() => handleRSVP(event.id)} disabled={!!isLoadingRsvp}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                            isRsvpd
                              ? 'bg-pink-100 border-pink-300 text-pink-700'
                              : 'bg-white border-pink-200 text-gray-700 hover:border-pink-400'
                          }`}>
                          {isLoadingRsvp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isRsvpd ? '✓ Going' : '+ RSVP'}
                        </button>

                        <button
                          onClick={() => handleTicketClick(event)}
                          disabled={!!isLoadingTicket || hasPurchased}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            hasPurchased
                              ? 'bg-green-500 text-white cursor-default'
                              : canAfford
                              ? 'bg-pink-500 text-white hover:bg-pink-600'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          } disabled:opacity-70`}>
                          {isLoadingTicket
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : hasPurchased
                            ? <><CheckCircle className="w-3.5 h-3.5" /> Got Ticket</>
                            : <><Ticket className="w-3.5 h-3.5" /> {isFree ? 'Get Ticket' : 'Buy Ticket'}</>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* My Tickets tab */}
        {activeTab === 'mytickets' && (
          !user ? (
            <div className="text-center py-20">
              <Ticket className="w-12 h-12 text-pink-200 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">Log in to see your tickets</p>
            </div>
          ) : ticketsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1,2].map(i => <div key={i} className="h-64 bg-pink-50 rounded-2xl animate-pulse" />)}
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {myTickets.map((t: any) => (
                <div key={t.id}>
                  <TicketCard
                    ticketId={t.id}
                    eventTitle={t.event.title}
                    eventDate={t.event.startDate}
                    venue={t.event.venue ?? undefined}
                    organizer={t.event.organizer?.name}
                    campus={t.event.campus}
                    price={t.event.price}
                    buyerName={user.name}
                    status="ACTIVE"
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
