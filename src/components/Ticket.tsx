import { Ticket as TicketIcon, Calendar, MapPin, User, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useRef } from 'react';

interface TicketProps {
  eventTitle:   string;
  eventDate:    string;
  venue?:       string;
  organizer?:   string;
  campus:       string;
  price:        number;
  ticketId?:    string;
  buyerName?:   string;
  status?:      string;
}

export default function Ticket({
  eventTitle,
  eventDate,
  venue,
  organizer,
  campus,
  price,
  ticketId,
  buyerName,
  status = 'ACTIVE',
}: TicketProps) {
  const ref = useRef<HTMLDivElement>(null);

  const download = async () => {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `kampas-ticket-${ticketId || 'event'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error('Ticket download failed', err); }
  };

  const date = new Date(eventDate);
  const day  = date.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-3">
      <div ref={ref} className="bg-white rounded-2xl overflow-hidden shadow-md border border-pink-200 max-w-sm mx-auto">
        {/* Header strip */}
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-black text-sm">K</span>
              </div>
              <span className="text-white/80 text-xs font-semibold">Kampas Events</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status === 'ACTIVE' ? 'bg-green-400 text-white' : 'bg-white/30 text-white'}`}>
              {status}
            </span>
          </div>
          <h2 className="text-white font-black text-lg leading-tight mt-2">{eventTitle}</h2>
        </div>

        {/* Ticket tear line */}
        <div className="relative h-4 bg-white">
          <div className="absolute left-0 right-0 top-0 h-px border-t-2 border-dashed border-pink-200" />
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full border border-pink-100" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full border border-pink-100" />
        </div>

        {/* Ticket body */}
        <div className="px-5 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-400 mb-0.5">Date & Time</p>
              <p className="font-bold text-gray-900 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-pink-400" />{day} · {time}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Campus</p>
              <p className="font-bold text-gray-900 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-pink-400" />{campus}
              </p>
            </div>
            {venue && (
              <div>
                <p className="text-gray-400 mb-0.5">Venue</p>
                <p className="font-bold text-gray-900">{venue}</p>
              </div>
            )}
            {organizer && (
              <div>
                <p className="text-gray-400 mb-0.5">Organizer</p>
                <p className="font-bold text-gray-900 flex items-center gap-1">
                  <User className="w-3 h-3 text-pink-400" />{organizer}
                </p>
              </div>
            )}
            {buyerName && (
              <div>
                <p className="text-gray-400 mb-0.5">Ticket Holder</p>
                <p className="font-bold text-gray-900">{buyerName}</p>
              </div>
            )}
            <div>
              <p className="text-gray-400 mb-0.5">Amount Paid</p>
              <p className="font-bold text-pink-500">{price === 0 ? 'FREE' : `KSH ${price.toLocaleString()}`}</p>
            </div>
          </div>

          {ticketId && (
            <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 mb-1">Ticket ID</p>
              <p className="font-mono text-sm font-bold text-gray-900 tracking-widest">
                #{ticketId.slice(-8).toUpperCase()}
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={download}
        className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 bg-white border border-pink-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl hover:bg-pink-50 hover:border-pink-400 transition-colors"
      >
        <Download className="w-4 h-4 text-pink-500" />
        Download Ticket
      </button>
    </div>
  );
}
