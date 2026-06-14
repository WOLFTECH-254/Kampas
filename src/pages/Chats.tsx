import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, MessageSquare, Search, ArrowLeft, Globe, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { socket, connectSocket, disconnectSocket } from '../lib/socket';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChatUser { id: string; name: string; avatar?: string; }

interface CommunityMessage {
  id: string; content: string; userId: string;
  user: ChatUser; createdAt: string;
}

interface ChatMessage {
  id: string; chatId?: string; content: string;
  senderId: string; sender: ChatUser;
  createdAt: string; type: string; isRead: boolean;
}

interface Chat {
  id: string; buyer: ChatUser; seller: ChatUser;
  messages: ChatMessage[]; lastMessage?: string; updatedAt: string;
}

interface Presence { [userId: string]: { online: boolean; lastSeen: string | null }; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function getOtherUser(chat: Chat, myId: string): ChatUser {
  return chat.buyer.id === myId ? chat.seller : chat.buyer;
}
function formatLastSeen(presence: Presence, userId: string): string {
  const p = presence[userId];
  if (!p) return '';
  if (p.online) return 'Online';
  if (!p.lastSeen) return 'Offline';
  const diff  = Date.now() - new Date(p.lastSeen).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `Last seen ${mins}m ago`;
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(diff / 86400000)}d ago`;
}
function formatChatTime(dateStr: string): string {
  const d = new Date(dateStr), now = new Date();
  if (now.getDate() === d.getDate() && now.getTime() - d.getTime() < 86400000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}
function formatMsgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, online, size = 'md' }: { user: ChatUser; online?: boolean; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className="relative flex-shrink-0">
      {user.avatar
        ? <img src={user.avatar} alt={user.name} className={`${sz} rounded-full object-cover`} />
        : <div className={`${sz} rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold`}>{getInitials(user.name)}</div>
      }
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-400' : 'bg-gray-300'}`} />
      )}
    </div>
  );
}

// ── Message bubble (shared by both community & DM) ────────────────────────────
function MsgBubble({
  content, isMine, senderName, senderAvatar, time, isRead, showHeader,
}: {
  content: string; isMine: boolean; senderName?: string; senderAvatar?: string;
  time: string; isRead?: boolean; showHeader: boolean;
}) {
  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar placeholder — keeps alignment consistent */}
      <div className="w-8 flex-shrink-0 flex items-end">
        {!isMine && showHeader && (
          senderAvatar
            ? <img src={senderAvatar} alt={senderName} className="w-8 h-8 rounded-full object-cover" />
            : <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-xs">
                {getInitials(senderName || '?')}
              </div>
        )}
      </div>

      <div className={`flex flex-col max-w-[68%] ${isMine ? 'items-end' : 'items-start'}`}>
        {showHeader && !isMine && senderName && (
          <span className="text-[11px] font-semibold text-pink-600 ml-1 mb-0.5">{senderName}</span>
        )}
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
          isMine
            ? 'bg-pink-500 text-white rounded-br-sm'
            : 'bg-white border border-pink-100 text-gray-900 rounded-bl-sm shadow-sm'
        }`}>
          {content}
        </div>
        <div className={`flex items-center gap-1 px-1 mt-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400">{time}</span>
          {isMine && isRead !== undefined && (
            <span className={`text-[10px] ${isRead ? 'text-pink-400' : 'text-gray-300'}`}>
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Chats() {
  const { user }                            = useAuth();
  const [searchParams, setSearchParams]     = useSearchParams();

  // Tab & mobile state
  const [tab, setTab]                       = useState<'community' | 'direct'>('community');
  const [mobileView, setMobileView]         = useState<'list' | 'chat'>('list');

  // Community
  const [communityMsgs, setCommunityMsgs]   = useState<CommunityMessage[]>([]);
  const [communityText, setCommunityText]   = useState('');
  const [sendingComm, setSendingComm]       = useState(false);
  const [loadingComm, setLoadingComm]       = useState(true);

  // Direct
  const [chats, setChats]                   = useState<Chat[]>([]);
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [text, setText]                     = useState('');
  const [sending, setSending]               = useState(false);
  const [loadingChats, setLoadingChats]     = useState(true);
  const [loadingMsgs, setLoadingMsgs]       = useState(false);
  const [typingUsers, setTypingUsers]       = useState<Set<string>>(new Set());
  const [search, setSearch]                 = useState('');
  const [presence, setPresence]             = useState<Presence>({});

  const communityEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const typingTimer     = useRef<ReturnType<typeof setTimeout>>();

  const selectedChat = chats.find(c => c.id === selectedId) ?? null;

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchChats = useCallback(async () => {
    try {
      const res = await api('/api/chats', { auth: true });
      const list = res.data.chats as Chat[];
      setChats(list);
      return list;
    } catch { return []; }
    finally { setLoadingChats(false); }
  }, []);

  const fetchPresence = useCallback(async (list: Chat[]) => {
    if (!user || !list.length) return;
    const ids = [...new Set(list.flatMap(c => [c.buyer.id, c.seller.id]).filter(id => id !== user.id))];
    if (!ids.length) return;
    try {
      const res = await fetch(`/presence?userIds=${ids.join(',')}`);
      setPresence(await res.json());
    } catch {}
  }, [user]);

  const fetchCommunity = useCallback(async () => {
    setLoadingComm(true);
    try {
      const res = await api('/api/community', { auth: true });
      setCommunityMsgs(res.data.messages);
    } catch {}
    finally { setLoadingComm(false); }
  }, []);

  // ── Auto-open from URL param ───────────────────────────────────────────────
  useEffect(() => {
    if (loadingChats) return;
    const targetId = searchParams.get('chatId');
    if (!targetId) return;
    const chat = chats.find(c => c.id === targetId);
    if (chat) {
      openDm(chat);
      setTab('direct');
      setSearchParams({}, { replace: true });
    }
  }, [chats, loadingChats]); // eslint-disable-line

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    connectSocket();
    fetchChats().then(c => fetchPresence(c));
    fetchCommunity();

    socket.on('user_online',  ({ userId }: { userId: string }) =>
      setPresence(p => ({ ...p, [userId]: { online: true, lastSeen: p[userId]?.lastSeen ?? null } })));
    socket.on('user_offline', ({ userId, lastSeen }: { userId: string; lastSeen: string }) =>
      setPresence(p => ({ ...p, [userId]: { online: false, lastSeen } })));

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setChats(prev => prev.map(c => c.id === msg.chatId ? { ...c, lastMessage: msg.content, updatedAt: msg.createdAt } : c));
    });
    socket.on('typing', ({ userId: uid, isTyping }: { userId: string; isTyping: boolean }) =>
      setTypingUsers(prev => { const s = new Set(prev); isTyping ? s.add(uid) : s.delete(uid); return s; }));

    socket.on('community_message', (msg: CommunityMessage) =>
      setCommunityMsgs(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));

    return () => {
      ['user_online','user_offline','new_message','typing','community_message'].forEach(e => socket.off(e));
      disconnectSocket();
    };
  }, [fetchChats, fetchPresence, fetchCommunity]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => { communityEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [communityMsgs]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openDm = async (chat: Chat) => {
    if (selectedId) socket.emit('leave_chat', selectedId);
    setSelectedId(chat.id);
    setMessages([]);
    setMobileView('chat');
    setLoadingMsgs(true);
    try {
      const res = await api(`/api/chats/${chat.id}/messages`, { auth: true });
      setMessages(res.data.messages);
    } catch {}
    finally { setLoadingMsgs(false); }
    socket.emit('join_chat', chat.id);
  };

  const sendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedId || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const res = await api(`/api/chats/${selectedId}/messages`, { method: 'POST', body: { content }, auth: true });
      const msg = res.data.message;
      setMessages(prev => [...prev, msg]);
      setChats(prev => prev.map(c => c.id === selectedId ? { ...c, lastMessage: content, updatedAt: msg.createdAt } : c));
      socket.emit('new_message', { chatId: selectedId, message: msg });
    } catch { setText(content); }
    finally { setSending(false); }
  };

  const sendCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityText.trim() || sendingComm) return;
    setSendingComm(true);
    const content = communityText.trim();
    setCommunityText('');
    try {
      const res = await api('/api/community', { method: 'POST', body: { content }, auth: true });
      const msg = res.data.message as CommunityMessage;
      setCommunityMsgs(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      socket.emit('community_message', msg);
    } catch { setCommunityText(content); }
    finally { setSendingComm(false); }
  };

  const handleTyping = (val: string) => {
    setText(val);
    if (!selectedId) return;
    socket.emit('typing', { chatId: selectedId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('typing', { chatId: selectedId, isTyping: false }), 1500);
  };

  const filteredChats = chats.filter(c => {
    if (!user || !search) return true;
    return getOtherUser(c, user.id).name.toLowerCase().includes(search.toLowerCase());
  });

  const lastCommMsg = communityMsgs[communityMsgs.length - 1];

  // ── Render ─────────────────────────────────────────────────────────────────
  const hideSidebar = mobileView === 'chat';
  const hideMain    = mobileView === 'list';

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-6xl mx-auto p-4 md:p-6 gap-4">

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div className={`w-full md:w-80 flex-shrink-0 bg-white border border-pink-100 rounded-2xl flex flex-col shadow-sm ${hideSidebar ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-pink-100 space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>

          {/* Tab switcher */}
          <div className="flex bg-pink-50 rounded-xl p-1 gap-1">
            {(['community', 'direct'] as const).map(t => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (t === 'community') setMobileView('chat');
                  else setMobileView('list');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  tab === t ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'community' ? <Globe className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                {t === 'community' ? 'Community' : 'Direct'}
              </button>
            ))}
          </div>

          {tab === 'direct' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-4 py-2 bg-pink-50 border border-pink-100 rounded-xl text-sm focus:outline-none focus:border-pink-400 transition-colors"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'community' ? (
            /* Single community entry */
            <button
              onClick={() => setMobileView('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pink-50 transition-colors border-l-2 ${
                mobileView === 'chat' ? 'bg-pink-50 border-pink-500' : 'border-transparent'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-gray-900">Kampas Community</p>
                  {lastCommMsg && <span className="text-[10px] text-gray-400">{formatChatTime(lastCommMsg.createdAt)}</span>}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {lastCommMsg ? `${lastCommMsg.user.name}: ${lastCommMsg.content}` : 'Public chat for all campus users'}
                </p>
              </div>
            </button>
          ) : loadingChats ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-pink-100 rounded w-3/4" />
                    <div className="h-2 bg-pink-50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <MessageSquare className="w-10 h-10 text-pink-200 mb-2" />
              <p className="text-sm font-medium text-gray-500">No direct messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Tap "Message Seller" on any product to start</p>
            </div>
          ) : (
            filteredChats.map(chat => {
              if (!user) return null;
              const other    = getOtherUser(chat, user.id);
              const isOnline = presence[other.id]?.online ?? false;
              const lastMsg  = chat.messages[0] ?? null;
              return (
                <button
                  key={chat.id}
                  onClick={() => openDm(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pink-50 transition-colors border-l-2 ${
                    selectedId === chat.id ? 'bg-pink-50 border-pink-500' : 'border-transparent'
                  }`}
                >
                  <Avatar user={other} online={isOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">{other.name}</p>
                      {chat.updatedAt && <span className="text-[10px] text-gray-400 flex-shrink-0">{formatChatTime(chat.updatedAt)}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {chat.lastMessage ?? lastMsg?.content ?? 'Start a conversation'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main panel ─────────────────────────────────────────────────────── */}
      <div className={`flex-1 bg-white border border-pink-100 rounded-2xl flex flex-col shadow-sm overflow-hidden ${hideMain ? 'hidden md:flex' : 'flex'}`}>

        {/* ── Community chat ──────────────────────────────────────────────── */}
        {tab === 'community' && (
          <>
            <div className="px-4 py-3 border-b border-pink-100 flex items-center gap-3">
              <button onClick={() => setMobileView('list')} className="md:hidden p-1 text-gray-500 hover:bg-pink-50 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Kampas Community</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Public · everyone can read and post
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-pink-50/20 to-white">
              {loadingComm ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : communityMsgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <Globe className="w-12 h-12 text-pink-200" />
                  <div>
                    <p className="font-semibold text-gray-700">Welcome to the community!</p>
                    <p className="text-sm text-gray-500 mt-1">Be the first to post something</p>
                  </div>
                </div>
              ) : (
                communityMsgs.map((msg, idx) => {
                  const isMine     = msg.userId === user?.id;
                  const prev       = communityMsgs[idx - 1];
                  const showHeader = !prev || prev.userId !== msg.userId;
                  return (
                    <MsgBubble
                      key={msg.id}
                      content={msg.content}
                      isMine={isMine}
                      senderName={msg.user.name}
                      senderAvatar={msg.user.avatar}
                      time={formatMsgTime(msg.createdAt)}
                      showHeader={showHeader}
                    />
                  );
                })
              )}
              <div ref={communityEndRef} />
            </div>

            <form onSubmit={sendCommunity} className="p-3 bg-white border-t border-pink-100 flex items-center gap-2">
              <input
                value={communityText}
                onChange={e => setCommunityText(e.target.value)}
                placeholder="Say something to the community…"
                className="flex-1 bg-pink-50 border border-pink-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-pink-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!communityText.trim() || sendingComm}
                className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </>
        )}

        {/* ── Direct Messages ─────────────────────────────────────────────── */}
        {tab === 'direct' && !selectedChat && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4">
            <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center">
              <MessageSquare className="w-9 h-9 text-pink-300" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">Direct Messages</h3>
              <p className="text-sm text-gray-500 mt-1">Select a conversation, or tap "Message Seller" on any product</p>
            </div>
          </div>
        )}

        {tab === 'direct' && selectedChat && user && (() => {
          const other    = getOtherUser(selectedChat, user.id);
          const isOnline = presence[other.id]?.online ?? false;
          const isTyping = typingUsers.has(other.id);
          return (
            <>
              <div className="px-4 py-3 border-b border-pink-100 flex items-center gap-3">
                <button onClick={() => { setMobileView('list'); setSelectedId(null); }} className="md:hidden p-1 text-gray-500 hover:bg-pink-50 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar user={other} online={isOnline} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm">{other.name}</h3>
                  <p className={`text-xs mt-0.5 flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                    {isTyping
                      ? <span className="text-pink-500 font-medium">typing…</span>
                      : <><span className={`w-1.5 h-1.5 rounded-full inline-block ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`} />
                        {formatLastSeen(presence, other.id) || (isOnline ? 'Online' : 'Offline')}</>
                    }
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-pink-50/20 to-white">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                    <MessageSquare className="w-10 h-10 text-pink-200" />
                    <p className="text-sm text-gray-500">No messages yet</p>
                    <p className="text-xs text-gray-400">Say hello to {other.name}!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine     = msg.senderId === user.id;
                    const prev       = messages[idx - 1];
                    const showHeader = !prev || prev.senderId !== msg.senderId;
                    return (
                      <MsgBubble
                        key={msg.id}
                        content={msg.content}
                        isMine={isMine}
                        senderName={isMine ? user.name : other.name}
                        senderAvatar={isMine ? user.avatar : other.avatar}
                        time={formatMsgTime(msg.createdAt)}
                        isRead={msg.isRead}
                        showHeader={showHeader}
                      />
                    );
                  })
                )}

                {isTyping && (
                  <div className="flex items-end gap-2">
                    <div className="w-8 flex-shrink-0">
                      <Avatar user={other} size="sm" />
                    </div>
                    <div className="bg-white border border-pink-100 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1 items-center shadow-sm">
                      <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendDm} className="p-3 bg-white border-t border-pink-100 flex items-center gap-2">
                <input
                  value={text}
                  onChange={e => handleTyping(e.target.value)}
                  placeholder={`Message ${other.name}…`}
                  className="flex-1 bg-pink-50 border border-pink-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-pink-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </>
          );
        })()}
      </div>
    </div>
  );
}
