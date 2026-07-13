
import { Wallet, Package, Heart, MapPin, Settings, HelpCircle, ArrowRight, Bell, LogOut, ShoppingCart, Trash2, Plus, Minus, RefreshCw, Receipt as ReceiptIcon, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET, POST, PUT, DEL } from '../lib/api';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import WalletModal from '../components/WalletModal';
import Receipt from '../components/Receipt';

interface Order {
  id: string; status: string; total: number; createdAt: string;
  items: { product: { title: string; images: { url: string }[] }; quantity: number; price: number }[];
}
interface WishlistItem {
  id: string; productId: string;
  product: { id: string; title: string; price: number; campus: string; images: { url: string }[]; seller: { name: string } };
}
interface CartItem {
  id: string; quantity: number; productId: string;
  product: { id: string; title: string; price: number; campus: string; images: { url: string }[]; stock: number };
}
interface CartData { id: string; items: CartItem[]; subtotal: number; deliveryFee: number; total: number; }
interface Address {
  id: string;
  label: string;
  hostelName?: string | null;
  roomNumber?: string | null;
  campus?: string | null;
  deliveryInstructions?: string | null;
  isDefault: boolean;
}

export default function BuyerDashboard() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [wallet,        setWallet]        = useState({ balance: 0, transactions: [] as any[] });
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [wishlist,      setWishlist]      = useState<WishlistItem[]>([]);
  const [cart,          setCart]          = useState<CartData | null>(null);
  const [addresses,     setAddresses]     = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [unreadNotifs,  setUnreadNotifs]  = useState(0);
  const [activeTab,     setActiveTab]     = useState(searchParams.get('tab') || 'orders');
  const [topupAmount,   setTopupAmount]   = useState('');
  const [topupLoading,  setTopupLoading]  = useState(false);
  const [topupMsg,      setTopupMsg]      = useState('');
  const [loading,       setLoading]       = useState(true);
  const [cartUpdating,  setCartUpdating]  = useState<string | null>(null);
  const [placingOrder,  setPlacingOrder]  = useState(false);
  const [orderMsg,      setOrderMsg]      = useState('');
  const [walletModal,   setWalletModal]   = useState(false);
  const [receiptOrder,  setReceiptOrder]  = useState<Order | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: '', hostelName: '', roomNumber: '', campus: '', deliveryInstructions: '', isDefault: false });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressMsg, setAddressMsg] = useState('');

  // Support tickets
  const [supportTickets,   setSupportTickets]   = useState<any[]>([]);
  const [selectedTicket,   setSelectedTicket]   = useState<any>(null);
  const [newTicket,        setNewTicket]        = useState({ subject: '', category: 'GENERAL', priority: 'NORMAL', message: '' });
  const [showNewTicket,    setShowNewTicket]    = useState(false);
  const [ticketReply,      setTicketReply]      = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [sendingReply,     setSendingReply]     = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [walletRes, ordersRes, wishlistRes, notifRes, cartRes, addressesRes] = await Promise.all([
        GET('/api/buyer/wallet'),
        GET('/api/buyer/orders'),
        GET('/api/buyer/wishlist'),
        GET('/api/buyer/notifications'),
        GET('/api/buyer/cart'),
        GET('/api/buyer/addresses'),
      ]);
      setWallet(walletRes.data);
      setOrders(ordersRes.data.orders);
      setWishlist(wishlistRes.data.items);
      setUnreadNotifs(notifRes.data.unread);
      setCart(cartRes.data);
      const fetchedAddresses = addressesRes.data.addresses as Address[];
      setAddresses(fetchedAddresses);
      setSelectedAddressId(current => current || fetchedAddresses.find(address => address.isDefault)?.id || fetchedAddresses[0]?.id || '');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const removeFromWishlist = async (productId: string) => {
    setWishlist(prev => prev.filter(i => i.productId !== productId));
    try { await DEL(`/api/buyer/wishlist/${productId}`); }
    catch { fetchAll(); }
  };

  const moveToCart = async (item: WishlistItem) => {
    try {
      await POST(`/api/buyer/cart/${item.productId}`, { quantity: 1 });
      await removeFromWishlist(item.productId);
      setActiveTab('cart');
      fetchAll();
    } catch (err: any) { alert(err.message); }
  };

  const updateCartQty = async (productId: string, quantity: number) => {
    if (quantity < 1) { removeFromCart(productId); return; }
    setCartUpdating(productId);
    try {
      await PUT(`/api/buyer/cart/${productId}`, { quantity });
      const res = await GET('/api/buyer/cart');
      setCart(res.data);
    } catch (err: any) { console.error(err); }
    finally { setCartUpdating(null); }
  };

  const removeFromCart = async (productId: string) => {
    setCartUpdating(productId);
    try {
      await DEL(`/api/buyer/cart/${productId}`);
      const res = await GET('/api/buyer/cart');
      setCart(res.data);
    } catch (err: any) { console.error(err); }
    finally { setCartUpdating(null); }
  };

  const placeOrderFromCart = async () => {
    if (!cart || cart.items.length === 0) return;
    if (!selectedAddressId) {
      setOrderMsg('Add and select a delivery address before placing your order.');
      setActiveTab('addresses');
      return;
    }
    if ((user?.walletBalance ?? 0) < (cart?.total ?? 0)) {
      setOrderMsg('Insufficient wallet balance. Please top up first.'); return;
    }
    setPlacingOrder(true);
    setOrderMsg('');
    try {
      await POST('/api/buyer/orders', {
        items: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        addressId: selectedAddressId,
        paymentMethod: 'WALLET',
      });
      await DEL('/api/buyer/cart');
      await refresh();
      fetchAll();
      setActiveTab('orders');
      setOrderMsg('');
    } catch (err: any) { setOrderMsg(err.message || 'Failed to place order'); }
    finally { setPlacingOrder(false); }
  };

  const saveAddress = async () => {
    if (!addressForm.label.trim()) return setAddressMsg('Give this address a label, such as Hostel or Home.');
    setAddressSaving(true);
    setAddressMsg('');
    try {
      const response = await POST('/api/buyer/addresses', {
        ...addressForm,
        campus: addressForm.campus.trim() || undefined,
        hostelName: addressForm.hostelName.trim() || undefined,
        roomNumber: addressForm.roomNumber.trim() || undefined,
        deliveryInstructions: addressForm.deliveryInstructions.trim() || undefined,
      });
      const address = response.data.address as Address;
      setAddresses(current => [address, ...current.filter(item => !address.isDefault || !item.isDefault)]);
      setSelectedAddressId(address.id);
      setAddressForm({ label: '', hostelName: '', roomNumber: '', campus: '', deliveryInstructions: '', isDefault: false });
      setShowAddressForm(false);
    } catch (error: any) {
      setAddressMsg(error.message || 'Could not save address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const setDefaultAddress = async (address: Address) => {
    try {
      await PUT(`/api/buyer/addresses/${address.id}`, { isDefault: true });
      setAddresses(current => current.map(item => ({ ...item, isDefault: item.id === address.id })));
      setSelectedAddressId(address.id);
    } catch (error: any) {
      setAddressMsg(error.message || 'Could not update the default address.');
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      await DEL(`/api/buyer/addresses/${id}`);
      setAddresses(current => current.filter(address => address.id !== id));
      setSelectedAddressId(current => current === id ? '' : current);
    } catch (error: any) {
      setAddressMsg(error.message || 'Could not delete address.');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const statusColor = (s: string) => ({
    PENDING: 'bg-yellow-100 text-yellow-700', CONFIRMED: 'bg-blue-100 text-blue-700',
    PROCESSING: 'bg-blue-100 text-blue-700', OUT_FOR_DELIVERY: 'bg-pink-100 text-pink-600',
    DELIVERED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-600',
  }[s] || 'bg-gray-100 text-gray-600');

  const fetchSupportTickets = async () => {
    try { const r = await GET('/api/support/tickets'); setSupportTickets(r.data.tickets); } catch {}
  };
  const loadSupportTicket = async (id: string) => {
    try { const r = await GET(`/api/support/tickets/${id}`); setSelectedTicket(r.data.ticket); setTicketReply(''); } catch {}
  };
  const createSupportTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) return;
    setSubmittingTicket(true);
    try {
      await POST('/api/support/tickets', newTicket);
      setShowNewTicket(false);
      setNewTicket({ subject: '', category: 'GENERAL', priority: 'NORMAL', message: '' });
      fetchSupportTickets();
    } catch {}
    finally { setSubmittingTicket(false); }
  };
  const sendTicketReply = async () => {
    if (!ticketReply.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      await POST(`/api/support/tickets/${selectedTicket.id}/messages`, { message: ticketReply.trim() });
      await loadSupportTicket(selectedTicket.id);
      setTicketReply('');
    } catch {}
    finally { setSendingReply(false); }
  };

  useEffect(() => { if (activeTab === 'support') fetchSupportTickets(); }, [activeTab]);

  const navItems = [
    { icon: Package,     label: 'My Orders',      tab: 'orders',       badge: orders.length },
    { icon: Heart,       label: 'Wishlist',        tab: 'wishlist',     badge: wishlist.length },
    { icon: ShoppingCart,label: 'Cart',            tab: 'cart',         badge: cart?.items.length || 0 },
    { icon: Wallet,      label: 'Transactions',    tab: 'transactions' },
    { icon: MapPin,      label: 'Addresses',       tab: 'addresses' },
    { icon: Settings,    label: 'Settings',        tab: 'settings' },
    { icon: HelpCircle,  label: 'Help & Support',  tab: 'support' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-pink-50 border border-pink-200 p-6 rounded-3xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[50px]"></div>
        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-pink-500 flex-shrink-0 bg-white">
          <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 text-center md:text-left z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <h1 className="text-2xl font-bold">{user?.name || 'Loading...'}</h1>
                {user?.isVerified
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Verified</span>
                  : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Unverified</span>
                }
              </div>
              <p className="text-gray-500 text-sm mb-1 flex items-center justify-center md:justify-start gap-1">
                <MapPin className="w-3 h-3 text-pink-500" /> {user?.campus || 'No campus set'}
              </p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifs > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-pink-500" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full text-white text-[10px] flex items-center justify-center">{unreadNotifs}</span>
                </div>
              )}
              <Link to="/profile" className="bg-white border border-pink-200 text-gray-900 text-sm font-semibold px-4 py-2 rounded-xl hover:text-pink-600 transition-colors">
                Edit Profile
              </Link>
              <button onClick={handleLogout} className="bg-white border border-pink-200 text-gray-400 p-2 rounded-xl hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">

          {/* Wallet */}
          <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-200 p-5 rounded-2xl">
            <h3 className="text-gray-500 text-xs font-semibold mb-1">Kampas Wallet</h3>
            <p className="text-2xl font-bold mb-4">KSH {(user?.walletBalance ?? 0).toLocaleString()}</p>
            <button onClick={() => navigate('/wallet')}
              className="w-full bg-green-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
              📱 Top Up via M-Pesa
            </button>
          </div>
          <WalletModal open={walletModal} onClose={() => setWalletModal(false)} onSuccess={() => { fetchAll(); }} />

          {/* Nav */}
          <div className="bg-pink-50 border border-pink-200 rounded-2xl overflow-hidden">
            {navItems.map(item => (
              <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center justify-between p-4 border-b border-pink-100 last:border-0 hover:bg-white transition-colors ${activeTab === item.tab ? 'bg-white border-l-2 border-l-pink-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${activeTab === item.tab ? 'text-pink-500' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${activeTab === item.tab ? 'text-gray-900' : 'text-gray-600'}`}>{item.label}</span>
                </div>
                {item.badge != null && item.badge > 0 && (
                  <span className="bg-pink-100 text-pink-600 text-xs px-2 py-0.5 rounded-full font-bold">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-4">

          {/* ── ORDERS ── */}
          {activeTab === 'orders' && (
            <>
              <h2 className="text-lg font-bold">My Orders</h2>
              {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> :
               orders.length === 0 ? (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-10 text-center">
                  <Package className="w-10 h-10 text-pink-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No orders yet.</p>
                  <button onClick={() => navigate('/explore')} className="mt-4 bg-pink-500 text-white text-sm font-bold px-6 py-2 rounded-xl hover:bg-pink-600 transition-colors">
                    Browse Products
                  </button>
                </div>
              ) : orders.map(order => (
                <div key={order.id} className="bg-pink-50 border border-pink-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-pink-100">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-pink-600 text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.status)}`}>{order.status.replace(/_/g,' ')}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-pink-100">
                        {item.product.images?.[0]
                          ? <img src={item.product.images[0].url} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-pink-100" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.product.title}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity} · KSH {item.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 border-t border-pink-100 mt-2">
                    <span className="text-sm font-bold">Total: KSH {order.total.toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReceiptOrder(receiptOrder?.id === order.id ? null : order)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-pink-600 border border-gray-200 hover:border-pink-300 px-2.5 py-1 rounded-lg transition-colors"
                        title="Download Receipt"
                      >
                        <ReceiptIcon className="w-3.5 h-3.5" /> Receipt
                      </button>
                      <button className="text-pink-500 hover:text-pink-700 transition-colors"><ArrowRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {receiptOrder?.id === order.id && (
                    <div className="mt-4 pt-4 border-t border-pink-100">
                      <Receipt order={order} buyerName={user?.name} />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── WISHLIST ── */}
          {activeTab === 'wishlist' && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">My Wishlist</h2>
                <span className="text-sm text-gray-400">{wishlist.length} items</span>
              </div>
              {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> :
               wishlist.length === 0 ? (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-10 text-center">
                  <Heart className="w-10 h-10 text-pink-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Your wishlist is empty.</p>
                  <button onClick={() => navigate('/explore')} className="mt-4 bg-pink-500 text-white text-sm font-bold px-6 py-2 rounded-xl hover:bg-pink-600 transition-colors">
                    Explore Products
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {wishlist.map(item => (
                    <div key={item.id} className="bg-pink-50 border border-pink-200 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-pink-100">
                        {item.product.images?.[0]
                          ? <img src={item.product.images[0].url} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-pink-100" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.product.title}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-pink-400" />{item.product.campus}
                        </p>
                        <p className="font-bold text-pink-500 text-sm mt-1">KSH {item.product.price.toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => moveToCart(item)}
                          className="bg-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" /> Add to Cart
                        </button>
                        <button onClick={() => removeFromWishlist(item.productId)}
                          className="bg-white border border-pink-200 text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── CART ── */}
          {activeTab === 'cart' && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">My Cart</h2>
                <span className="text-sm text-gray-400">{cart?.items.length || 0} items</span>
              </div>

              {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> :
               !cart || cart.items.length === 0 ? (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-10 text-center">
                  <ShoppingCart className="w-10 h-10 text-pink-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Your cart is empty.</p>
                  <button onClick={() => navigate('/explore')} className="mt-4 bg-pink-500 text-white text-sm font-bold px-6 py-2 rounded-xl hover:bg-pink-600 transition-colors">
                    Start Shopping
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.items.map(item => (
                      <div key={item.id} className="bg-pink-50 border border-pink-200 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-pink-100">
                          {item.product.images?.[0]
                            ? <img src={item.product.images[0].url} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-pink-100" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{item.product.title}</p>
                          <p className="font-bold text-pink-500 text-sm mt-0.5">KSH {item.product.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                            disabled={cartUpdating === item.productId}
                            className="w-7 h-7 rounded-lg bg-white border border-pink-200 flex items-center justify-center hover:bg-pink-100 transition-colors disabled:opacity-50">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">
                            {cartUpdating === item.productId ? <RefreshCw className="w-3 h-3 animate-spin mx-auto" /> : item.quantity}
                          </span>
                          <button onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                            disabled={cartUpdating === item.productId || item.quantity >= item.product.stock}
                            className="w-7 h-7 rounded-lg bg-white border border-pink-200 flex items-center justify-center hover:bg-pink-100 transition-colors disabled:opacity-50">
                            <Plus className="w-3 h-3" />
                          </button>
                          <button onClick={() => removeFromCart(item.productId)}
                            disabled={cartUpdating === item.productId}
                            className="w-7 h-7 rounded-lg bg-white border border-red-200 text-red-400 flex items-center justify-center hover:bg-red-50 transition-colors ml-1 disabled:opacity-50">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order summary */}
                  <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5 mt-2">
                    <h3 className="font-bold mb-4">Order Summary</h3>
                    <div className="mb-4 rounded-xl border border-pink-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-sm font-semibold text-gray-800">Delivery address</p>
                        <button onClick={() => setActiveTab('addresses')} className="text-xs font-bold text-pink-600 hover:text-pink-700">Manage addresses</button>
                      </div>
                      {addresses.length === 0 ? (
                        <p className="text-xs text-orange-600">Add an address before placing this order.</p>
                      ) : (
                        <select value={selectedAddressId} onChange={event => setSelectedAddressId(event.target.value)} className="w-full rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm focus:outline-none focus:border-pink-400">
                          <option value="">Choose a delivery address</option>
                          {addresses.map(address => (
                            <option key={address.id} value={address.id}>{address.label}{address.hostelName ? ` — ${address.hostelName}` : ''}{address.roomNumber ? `, ${address.roomNumber}` : ''}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>KSH {cart.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Delivery Fee</span>
                        <span>KSH {cart.deliveryFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-pink-200">
                        <span>Total</span>
                        <span>KSH {cart.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Wallet Balance</span>
                        <span className={(user?.walletBalance ?? 0) >= cart.total ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                          KSH {(user?.walletBalance ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {orderMsg && (
                      <p className="text-xs text-red-500 mb-3 bg-red-50 border border-red-200 rounded-lg p-2">{orderMsg}</p>
                    )}

                    {(user?.walletBalance ?? 0) < cart.total && (
                      <p className="text-xs text-orange-600 mb-3 bg-orange-50 border border-orange-200 rounded-lg p-2">
                        ⚠️ Insufficient balance. Top up KSH {(cart.total - (user?.walletBalance ?? 0)).toLocaleString()} more.
                      </p>
                    )}

                    <button onClick={placeOrderFromCart} disabled={placingOrder || cart.items.length === 0 || !selectedAddressId || (user?.walletBalance ?? 0) < cart.total}
                      className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                      {placingOrder ? <><RefreshCw className="w-4 h-4 animate-spin" /> Placing Order...</> : <><ShoppingCart className="w-4 h-4" /> Place Order · KSH {cart.total.toLocaleString()}</>}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── TRANSACTIONS ── */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Delivery Addresses</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Choose where sellers should deliver your orders.</p>
                </div>
                <button onClick={() => { setAddressMsg(''); setShowAddressForm(current => !current); }} className="flex items-center gap-1.5 bg-pink-500 text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-pink-600 transition-colors">
                  <Plus className="w-4 h-4" /> Add address
                </button>
              </div>

              {showAddressForm && (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 space-y-3">
                  <h3 className="font-semibold text-sm">New delivery address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={addressForm.label} onChange={event => setAddressForm(current => ({ ...current, label: event.target.value }))} placeholder="Label (e.g. Main hostel)" className="rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
                    <input value={addressForm.campus} onChange={event => setAddressForm(current => ({ ...current, campus: event.target.value }))} placeholder="Campus" className="rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
                    <input value={addressForm.hostelName} onChange={event => setAddressForm(current => ({ ...current, hostelName: event.target.value }))} placeholder="Hostel or building" className="rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
                    <input value={addressForm.roomNumber} onChange={event => setAddressForm(current => ({ ...current, roomNumber: event.target.value }))} placeholder="Room / unit number" className="rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
                  </div>
                  <textarea value={addressForm.deliveryInstructions} onChange={event => setAddressForm(current => ({ ...current, deliveryInstructions: event.target.value }))} placeholder="Delivery instructions (optional)" rows={2} className="w-full rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400 resize-none" />
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={addressForm.isDefault} onChange={event => setAddressForm(current => ({ ...current, isDefault: event.target.checked }))} /> Set as my default delivery address
                  </label>
                  {addressMsg && <p className="text-xs text-red-500">{addressMsg}</p>}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddressForm(false)} className="px-3 py-2 text-sm font-semibold text-gray-600">Cancel</button>
                    <button onClick={saveAddress} disabled={addressSaving} className="px-4 py-2 rounded-xl bg-pink-500 text-white text-sm font-bold disabled:opacity-60">{addressSaving ? 'Saving...' : 'Save address'}</button>
                  </div>
                </div>
              )}

              {addresses.length === 0 ? (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-10 text-center">
                  <MapPin className="w-10 h-10 text-pink-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No saved delivery addresses yet.</p>
                </div>
              ) : addresses.map(address => (
                <div key={address.id} className={`rounded-2xl border p-4 ${selectedAddressId === address.id ? 'border-pink-400 bg-pink-50' : 'border-pink-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => setSelectedAddressId(address.id)} className="flex items-start gap-3 text-left flex-1">
                      <span className={`mt-0.5 w-4 h-4 rounded-full border-2 ${selectedAddressId === address.id ? 'border-pink-500 bg-pink-500 shadow-[inset_0_0_0_3px_white]' : 'border-gray-300'}`} />
                      <span>
                        <span className="flex items-center gap-2"><span className="font-semibold text-sm">{address.label}</span>{address.isDefault && <span className="text-[10px] font-bold text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded-full">DEFAULT</span>}</span>
                        <span className="block text-xs text-gray-500 mt-1">{[address.roomNumber, address.hostelName, address.campus].filter(Boolean).join(' · ') || 'No location details added'}</span>
                        {address.deliveryInstructions && <span className="block text-xs text-gray-400 mt-1">{address.deliveryInstructions}</span>}
                      </span>
                    </button>
                    <div className="flex gap-2 text-xs font-semibold">
                      {!address.isDefault && <button onClick={() => setDefaultAddress(address)} className="text-pink-600 hover:text-pink-700">Default</button>}
                      <button onClick={() => deleteAddress(address.id)} className="text-red-500 hover:text-red-600">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'transactions' && (
            <>
              <h2 className="text-lg font-bold">Wallet Transactions</h2>
              {wallet.transactions.length === 0 ? (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-10 text-center">
                  <Wallet className="w-10 h-10 text-pink-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No transactions yet.</p>
                </div>
              ) : (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl overflow-hidden">
                  {wallet.transactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border-b border-pink-100 last:border-0">
                      <div>
                        <p className="text-sm font-semibold">{tx.description || tx.type}</p>
                        <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}KSH {Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── SUPPORT ── */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Help &amp; Support</h2>
                {!showNewTicket && !selectedTicket && (
                  <button onClick={() => setShowNewTicket(true)}
                    className="flex items-center gap-2 bg-pink-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-pink-600 transition-colors">
                    <Plus className="w-4 h-4" /> New Ticket
                  </button>
                )}
              </div>

              {/* New ticket form */}
              {showNewTicket && (
                <div className="bg-white border border-pink-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">New Support Ticket</h3>
                    <button onClick={() => setShowNewTicket(false)} className="text-gray-400 hover:text-gray-600"><ArrowRight className="w-4 h-4 rotate-180" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Category</label>
                      <select value={newTicket.category} onChange={e => setNewTicket(p => ({ ...p, category: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400">
                        <option value="GENERAL">General</option>
                        <option value="ORDER">Order Issue</option>
                        <option value="PAYMENT">Payment</option>
                        <option value="ACCOUNT">Account</option>
                        <option value="TECHNICAL">Technical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Priority</label>
                      <select value={newTicket.priority} onChange={e => setNewTicket(p => ({ ...p, priority: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400">
                        <option value="LOW">Low</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Subject</label>
                    <input type="text" value={newTicket.subject} onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))}
                      placeholder="Briefly describe your issue"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Message</label>
                    <textarea value={newTicket.message} onChange={e => setNewTicket(p => ({ ...p, message: e.target.value }))}
                      rows={4} placeholder="Describe your issue in detail..."
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={createSupportTicket} disabled={submittingTicket || !newTicket.subject.trim() || !newTicket.message.trim()}
                      className="flex-1 bg-pink-500 text-white font-bold py-2.5 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {submittingTicket ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {submittingTicket ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                    <button onClick={() => setShowNewTicket(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              {/* Thread view */}
              {selectedTicket && !showNewTicket && (
                <div className="bg-white border border-pink-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-pink-100">
                    <div>
                      <button onClick={() => setSelectedTicket(null)} className="text-xs text-pink-500 font-bold mb-1 hover:underline">← Back</button>
                      <h3 className="font-semibold text-gray-900">{selectedTicket.subject}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedTicket.status === 'OPEN' ? 'bg-red-100 text-red-600' : selectedTicket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {selectedTicket.status.replace('_',' ')}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                    {selectedTicket.messages?.map((m: any) => (
                      <div key={m.id} className={`flex gap-2 ${m.senderRole === 'ADMIN' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${m.senderRole === 'ADMIN' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {m.senderRole === 'ADMIN' ? 'K' : user?.name?.[0] || 'U'}
                        </div>
                        <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${m.senderRole === 'ADMIN' ? 'bg-pink-500 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                          {m.senderRole === 'ADMIN' && <p className="text-[9px] text-pink-200 font-bold mb-0.5">Kampas Support</p>}
                          <p>{m.message}</p>
                          <p className={`text-[10px] mt-1 ${m.senderRole === 'ADMIN' ? 'text-pink-200' : 'text-gray-400'}`}>
                            {new Date(m.createdAt).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedTicket.status !== 'CLOSED' ? (
                    <div className="p-4 border-t border-pink-100 flex gap-2">
                      <input type="text" value={ticketReply} onChange={e => setTicketReply(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendTicketReply(); } }}
                        placeholder="Type a reply…"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400" />
                      <button onClick={sendTicketReply} disabled={sendingReply || !ticketReply.trim()}
                        className="bg-pink-500 text-white p-2.5 rounded-xl hover:bg-pink-600 transition-colors disabled:opacity-60">
                        {sendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <p className="p-3 text-center text-xs text-gray-400 border-t border-pink-100">Ticket closed. <button onClick={() => setShowNewTicket(true)} className="text-pink-500 font-bold">Open a new ticket</button></p>
                  )}
                </div>
              )}

              {/* Tickets list */}
              {!showNewTicket && !selectedTicket && (
                supportTickets.length === 0 ? (
                  <div className="bg-pink-50 border border-pink-200 rounded-2xl p-10 text-center">
                    <HelpCircle className="w-10 h-10 text-pink-200 mx-auto mb-3" />
                    <p className="font-semibold text-gray-700 mb-1">No support tickets yet</p>
                    <p className="text-sm text-gray-400 mb-4">Our team typically responds within 24 hours</p>
                    <button onClick={() => setShowNewTicket(true)} className="bg-pink-500 text-white font-bold text-sm px-5 py-2 rounded-xl hover:bg-pink-600 transition-colors">
                      Create First Ticket
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {supportTickets.map((t: any) => (
                      <button key={t.id} onClick={() => loadSupportTicket(t.id)}
                        className="w-full bg-white border border-pink-200 rounded-2xl p-4 hover:border-pink-400 hover:shadow-sm transition-all text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm truncate">{t.subject}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t.category} · {new Date(t.updatedAt).toLocaleDateString('en-KE', { day:'numeric', month:'short' })}</p>
                          </div>
                          <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'OPEN' ? 'bg-red-100 text-red-600' : t.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {t.status.replace('_',' ')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── OTHER TABS ── */}
          {!['orders','wishlist','cart','transactions','support'].includes(activeTab) && (
            <div className="bg-pink-50 border border-pink-200 rounded-2xl p-10 text-center">
              <Settings className="w-10 h-10 text-pink-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm capitalize">{activeTab} — coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
