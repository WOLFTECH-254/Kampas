
import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Package, MessageCircle, Star, Megaphone, Settings, ShieldCheck } from 'lucide-react';
import { GET, PUT } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  isRead:    boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, { icon: any; color: string; bg: string }> = {
  ORDER:  { icon: Package,       color: 'text-blue-600',   bg: 'bg-blue-100'   },
  CHAT:   { icon: MessageCircle, color: 'text-pink-600',   bg: 'bg-pink-100'   },
  REVIEW: { icon: Star,          color: 'text-yellow-600', bg: 'bg-yellow-100' },
  PROMO:  { icon: Megaphone,     color: 'text-purple-600', bg: 'bg-purple-100' },
  SYSTEM: { icon: Settings,      color: 'text-gray-600',   bg: 'bg-gray-100'   },
  EMAIL_VERIFIED: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-100' },
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread,        setUnread]        = useState(0);
  const [loading,       setLoading]       = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await GET('/api/buyer/notifications');
      setNotifications(res.data.notifications);
      setUnread(res.data.unread);
    } catch {}
  };

  const handleOpen = async () => {
    setOpen(v => !v);
    if (!open && unread > 0) {
      // Small delay so user sees the dropdown first
      setTimeout(markAllRead, 1500);
    }
  };

  const markAllRead = async () => {
    try {
      await PUT('/api/buyer/notifications/read-all', {});
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const markOneRead = async (id: string) => {
    try {
      await PUT(`/api/buyer/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-xl hover:bg-pink-50"
      >
        <Bell className={`w-5 h-5 ${unread > 0 ? 'text-pink-600' : ''}`} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-pink-200 rounded-2xl shadow-xl shadow-pink-100/50 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-pink-100">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">Notifications</h3>
              {unread > 0 && (
                <span className="bg-pink-100 text-pink-600 text-xs font-bold px-2 py-0.5 rounded-full">{unread} new</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="text-xs text-pink-500 hover:text-pink-700 font-medium flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-pink-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-pink-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => {
                const config = TYPE_ICON[notif.type] || TYPE_ICON.SYSTEM;
                const Icon   = config.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && markOneRead(notif.id)}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
                      notif.isRead ? 'bg-white hover:bg-pink-50/50' : 'bg-pink-50/70 hover:bg-pink-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${notif.isRead ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-pink-100 px-4 py-2.5 text-center">
              <button className="text-xs text-pink-500 hover:text-pink-700 font-medium">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
