import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const write = (filePath, content) => {
  fs.writeFileSync(path.join(__dirname, filePath), content, 'utf8');
  console.log(`  📄 ${filePath}`);
};

console.log('\n=============================================');
console.log('  💬 Kampas — Connecting Chats');
console.log('=============================================\n');

// ── 1. Socket stub (fixes import error) ──────────────────────────────────────
fs.mkdirSync(path.join(__dirname, 'src/lib'), { recursive: true });
write('src/lib/socket.ts', `
// Socket.IO will be implemented in Phase 2
// For now we use REST API polling
export const socket = {
  on:   () => {},
  off:  () => {},
  emit: () => {},
  id:   'local',
};
`);

// ── 2. Full Chats page ────────────────────────────────────────────────────────
write('src/pages/Chats.tsx', `
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MapPin, ArrowLeft, Search, MessageCircle, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GET, POST } from '../lib/api';
import { useSearchParams } from 'react-router-dom';

interface Chat {
  id: string;
  buyerId: string;
  sellerId: string;
  lastMessage: string | null;
  updatedAt: string;
  buyer:  { id: string; name: string; avatar: string | null; campus: string | null };
  seller: { id: string; name: string; avatar: string | null; campus: string | null };
  messages: { content: string; isRead: boolean; senderId: string }[];
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; name: string; avatar: string | null };
}

const timeAgo = (date: string) => {
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'now';
  if (mins < 60)  return \`\${mins}m\`;
  if (hours < 24) return \`\${hours}h\`;
  return \`\${days}d\`;
};

export default function Chats() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [chats,          setChats]          = useState<Chat[]>([]);
  const [activeChat,     setActiveChat]      = useState<Chat | null>(null);
  const [messages,       setMessages]        = useState<Message[]>([]);
  const [messageText,    setMessageText]     = useState('');
  const [sending,        setSending]         = useState(false);
  const [loadingChats,   setLoadingChats]    = useState(true);
  const [loadingMsgs,    setLoadingMsgs]     = useState(false);
  const [showList,       setShowList]        = useState(true); // mobile
  const [search,         setSearch]          = useState('');
  const [startingChat,   setStartingChat]    = useState(false);
  const [sellerIdInput,  setSellerIdInput]   = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // Auto-open chat from URL param ?sellerId=xxx
  useEffect(() => {
    const sellerId = searchParams.get('sellerId');
    if (sellerId) startChatWithSeller(sellerId);
  }, []);

  useEffect(() => { fetchChats(); }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
      // Poll for new messages every 3 seconds
      pollRef.current = setInterval(() => fetchMessages(activeChat.id, true), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const res = await GET('/api/chats');
      setChats(res.data.chats);
    } catch (e) { console.error(e); }
    finally { setLoadingChats(false); }
  };

  const fetchMessages = async (chatId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await GET(\`/api/chats/\${chatId}/messages\`);
      setMessages(res.data.messages);
    } catch (e) { console.error(e); }
    finally { if (!silent) setLoadingMsgs(false); }
  };

  const openChat = (chat: Chat) => {
    setActiveChat(chat);
    setShowList(false);
    fetchMessages(chat.id);
    // Mark chat as read in local state
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, messages: c.messages.map(m => ({ ...m, isRead: true })) } : c));
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const startChatWithSeller = async (sellerId: string) => {
    if (!sellerId.trim()) return;
    setStartingChat(true);
    try {
      const res = await POST(\`/api/chats/\${sellerId}\`, {});
      await fetchChats();
      openChat(res.data.chat);
      setSellerIdInput('');
    } catch (e: any) {
      console.error(e);
    } finally { setStartingChat(false); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat || sending) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    // Optimistic update
    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      chatId: activeChat.id,
      senderId: user!.id,
      content: text,
      type: 'TEXT',
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: { id: user!.id, name: user!.name, avatar: user?.avatar || null },
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await POST(\`/api/chats/\${activeChat.id}/messages\`, { content: text });
      // Refresh to get real message
      await fetchMessages(activeChat.id, true);
      // Update last message in sidebar
      setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, lastMessage: text, updatedAt: new Date().toISOString() } : c));
    } catch (e) {
      console.error(e);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setMessageText(text);
    } finally { setSending(false); }
  };

  const getOtherUser = (chat: Chat) => {
    return user?.id === chat.buyerId ? chat.seller : chat.buyer;
  };

  const hasUnread = (chat: Chat) => {
    return chat.messages.some(m => !m.isRead && m.senderId !== user?.id);
  };

  const filteredChats = chats.filter(c => {
    const other = getOtherUser(c);
    return !search || other.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden">

      {/* ── Sidebar — Chat List ─────────────────────────────────────────── */}
      <div className={\`\${showList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 border-r border-pink-100 bg-white flex-shrink-0\`}>

        {/* Header */}
        <div className="p-4 border-b border-pink-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Messages</h2>
            <span className="text-xs text-gray-400">{chats.length} conversations</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search conversations..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-pink-50 border border-pink-200 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-pink-500" />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-pink-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-16 px-6">
              <MessageCircle className="w-12 h-12 text-pink-200 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold text-sm">No conversations yet</p>
              <p className="text-gray-400 text-xs mt-1">Browse the marketplace and message a seller to get started.</p>
            </div>
          ) : (
            filteredChats
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map(chat => {
                const other   = getOtherUser(chat);
                const unread  = hasUnread(chat);
                const isActive = activeChat?.id === chat.id;
                return (
                  <button key={chat.id} onClick={() => openChat(chat)}
                    className={\`w-full flex items-center gap-3 p-4 hover:bg-pink-50 transition-colors border-b border-pink-50 text-left \${isActive ? 'bg-pink-50 border-l-2 border-l-pink-500' : ''}\`}>
                    <div className="relative flex-shrink-0">
                      <img
                        src={other.avatar || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${other.name}\`}
                        className="w-11 h-11 rounded-full border border-pink-200"
                      />
                      {unread && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-pink-500 rounded-full border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={\`text-sm truncate \${unread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}\`}>{other.name}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{timeAgo(chat.updatedAt)}</span>
                      </div>
                      <p className={\`text-xs truncate \${unread ? 'text-gray-700 font-medium' : 'text-gray-400'}\`}>
                        {chat.lastMessage || 'Start a conversation'}
                      </p>
                      {other.campus && (
                        <p className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" /> {other.campus}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
          )}
        </div>
      </div>

      {/* ── Main Chat Area ──────────────────────────────────────────────── */}
      <div className={\`\${!showList ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-hidden\`}>
        {!activeChat ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-pink-50/30">
            <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Your Messages</h3>
            <p className="text-gray-400 text-sm max-w-xs">Select a conversation or start a new one by messaging a seller from the marketplace.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 p-4 bg-white border-b border-pink-100 flex-shrink-0">
              <button onClick={() => setShowList(true)} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <img
                src={getOtherUser(activeChat).avatar || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${getOtherUser(activeChat).name}\`}
                className="w-10 h-10 rounded-full border border-pink-200"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{getOtherUser(activeChat).name}</p>
                {getOtherUser(activeChat).campus && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-pink-400" />
                    {getOtherUser(activeChat).campus}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-opacity-5">
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-pink-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <p className="text-gray-400 text-sm">No messages yet.</p>
                  <p className="text-gray-300 text-xs mt-1">Say hello! 👋</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={\`flex \${isMine ? 'justify-end' : 'justify-start'} items-end gap-2\`}>
                      {!isMine && (
                        <img src={msg.sender.avatar || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${msg.sender.name}\`}
                          className="w-7 h-7 rounded-full border border-pink-200 flex-shrink-0 mb-1" />
                      )}
                      <div className={\`max-w-[70%] \${isMine ? 'items-end' : 'items-start'} flex flex-col\`}>
                        {!isMine && <p className="text-[10px] text-gray-400 mb-1 ml-1">{msg.sender.name}</p>}
                        <div className={\`px-4 py-2.5 rounded-2xl \${isMine
                          ? 'bg-pink-500 text-white rounded-br-sm'
                          : 'bg-white border border-pink-100 text-gray-900 rounded-bl-sm shadow-sm'
                        }\`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        <p className={\`text-[10px] mt-1 \${isMine ? 'text-right text-gray-400' : 'text-gray-400 ml-1'}\`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMine && <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="flex items-center gap-3 p-4 bg-white border-t border-pink-100 flex-shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-pink-50 border border-pink-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 transition-colors"
              />
              <button type="submit" disabled={!messageText.trim() || sending}
                className="w-11 h-11 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 disabled:opacity-50 transition-colors flex-shrink-0 shadow-sm">
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
`);

// ── 3. Add "Message Seller" button to Marketplace product cards ──────────────
// Read the current marketplace and add a chat button
const marketplacePath = path.join(__dirname, 'src/pages/Marketplace.tsx');
let marketplace = fs.readFileSync(marketplacePath, 'utf8');

// Add useNavigate import if not already there
if (!marketplace.includes('useNavigate')) {
  marketplace = marketplace.replace(
    `import { useAuth } from '../context/AuthContext';`,
    `import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';`
  );
  // Add navigate hook after useAuth
  marketplace = marketplace.replace(
    `  const { user } = useAuth();`,
    `  const { user } = useAuth();
  const navigate = useNavigate();`
  );
}

// Add MessageCircle to imports
if (!marketplace.includes('MessageCircle')) {
  marketplace = marketplace.replace(
    `import { MapPin, Heart, ShoppingCart, Search, Star, Package, X, ChevronDown, SlidersHorizontal } from 'lucide-react';`,
    `import { MapPin, Heart, ShoppingCart, Search, Star, Package, X, ChevronDown, SlidersHorizontal, MessageCircle } from 'lucide-react';`
  );
}

// Add message seller button next to cart button in product card
marketplace = marketplace.replace(
  `                      <button
                        onClick={e => addToCart(product.id, e)}
                        disabled={product.stock === 0 || cartLoading === product.id || inCart}
                        title={inCart ? 'Already in cart' : 'Add to cart'}`,
  `                      <button
                        onClick={e => { e.stopPropagation(); navigate(\`/chats?sellerId=\${product.seller.id}\`); }}
                        title="Message seller"
                        className="w-7 h-7 rounded-lg flex items-center justify-center border bg-pink-50 border-pink-200 text-gray-600 hover:bg-pink-500 hover:border-pink-500 hover:text-white transition-all">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => addToCart(product.id, e)}
                        disabled={product.stock === 0 || cartLoading === product.id || inCart}
                        title={inCart ? 'Already in cart' : 'Add to cart'}`
);

fs.writeFileSync(marketplacePath, marketplace);
console.log('  📄 src/pages/Marketplace.tsx (Message Seller button added)');

console.log('\n=============================================');
console.log('  ✅ Chats connected!');
console.log('');
console.log('  Features:');
console.log('  - Real conversation list from API');
console.log('  - Real messages with sender avatars');
console.log('  - Send messages (optimistic update)');
console.log('  - Polls for new messages every 3s');
console.log('  - Unread message indicator (dot)');
console.log('  - Read receipts (✓ / ✓✓)');
console.log('  - Mobile: slide between list & chat');
console.log('  - Message Seller button on product cards');
console.log('  - Auto-open chat from ?sellerId= URL');
console.log('  - Time ago display (now, 5m, 2h, 1d)');
console.log('  - Typing auto-scroll to bottom');
console.log('=============================================\n');