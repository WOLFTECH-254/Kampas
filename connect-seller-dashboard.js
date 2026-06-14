import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const write = (filePath, content) => {
  fs.writeFileSync(path.join(__dirname, filePath), content, 'utf8');
  console.log(`  📄 ${filePath}`);
};

console.log('\n=============================================');
console.log('  🏪 Kampas — Seller Dashboard');
console.log('=============================================\n');

write('src/pages/SellerDashboard.tsx', `
import {
  Package, TrendingUp, DollarSign, Users, ShoppingCart, Megaphone,
  Plus, LayoutDashboard, Store, Settings, Wallet, ArrowUpRight,
  Edit2, Trash2, ToggleLeft, ToggleRight, CheckCircle, XCircle,
  RefreshCw, AlertCircle, ChevronRight, Eye, EyeOff, LogOut,
  MapPin, Star, X, Save, Truck, Clock,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET, POST, PUT, DEL } from '../lib/api';
import { useNavigate } from 'react-router-dom';

type Tab = 'overview' | 'products' | 'orders' | 'wallet' | 'store' | 'ads';

const STATUS_FLOW: Record<string, string> = {
  PENDING:          'CONFIRMED',
  CONFIRMED:        'PROCESSING',
  PROCESSING:       'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:          'Confirm',
  CONFIRMED:        'Process',
  PROCESSING:       'Ship',
  OUT_FOR_DELIVERY: 'Mark Delivered',
  DELIVERED:        'Delivered',
  CANCELLED:        'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:          'bg-yellow-100 text-yellow-700',
  CONFIRMED:        'bg-blue-100 text-blue-700',
  PROCESSING:       'bg-indigo-100 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-pink-100 text-pink-600',
  DELIVERED:        'bg-green-100 text-green-700',
  CANCELLED:        'bg-red-100 text-red-600',
};

const CONDITIONS = ['NEW', 'SLIGHTLY_USED', 'USED', 'THRIFTED'];

export default function SellerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  // Analytics
  const [analytics,  setAnalytics]  = useState<any>(null);
  const [salesData,  setSalesData]  = useState<any[]>([]);
  const [loadingAna, setLoadingAna] = useState(true);

  // Products
  const [products,    setProducts]    = useState<any[]>([]);
  const [loadingProd, setLoadingProd] = useState(false);
  const [showProdForm,setShowProdForm]= useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [prodForm,    setProdForm]    = useState({ title: '', description: '', price: '', campus: user?.campus || '', condition: 'NEW', stock: '1', isActive: true, images: [{ url: '', isPrimary: true }] });
  const [savingProd,  setSavingProd]  = useState(false);

  // Orders
  const [orders,     setOrders]     = useState<any[]>([]);
  const [orderFilter,setOrderFilter]= useState('');
  const [loadingOrd, setLoadingOrd] = useState(false);
  const [updatingOrd,setUpdatingOrd]= useState<string | null>(null);

  // Wallet
  const [wallet,      setWallet]      = useState<any>({ balance: 0, pending: 0, transactions: [] });
  const [payoutPhone, setPayoutPhone] = useState(user?.phone || '');
  const [payoutAmt,   setPayoutAmt]   = useState('');
  const [payingOut,   setPayingOut]   = useState(false);
  const [payoutMsg,   setPayoutMsg]   = useState('');

  // Store
  const [store,      setStore]      = useState<any>(null);
  const [storeForm,  setStoreForm]  = useState<any>({});
  const [savingStore,setSavingStore]= useState(false);
  const [storeMsg,   setStoreMsg]   = useState('');

  // Ads
  const [ads,       setAds]       = useState<any[]>([]);
  const [adAnalytics,setAdAnalytics]=useState<any>(null);
  const [showAdForm, setShowAdForm]= useState(false);
  const [adForm,    setAdForm]    = useState({ title: '', description: '', targetCampus: '', budget: '' });
  const [savingAd,  setSavingAd]  = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchAnalytics(); }, []);
  useEffect(() => { if (tab === 'products') fetchProducts(); }, [tab]);
  useEffect(() => { if (tab === 'orders')   fetchOrders(); }, [tab, orderFilter]);
  useEffect(() => { if (tab === 'wallet')   fetchWallet(); }, [tab]);
  useEffect(() => { if (tab === 'store')    fetchStore(); }, [tab]);
  useEffect(() => { if (tab === 'ads')      fetchAds(); }, [tab]);

  const fetchAnalytics = async () => {
    setLoadingAna(true);
    try {
      const [anaRes, salesRes] = await Promise.all([
        GET('/api/seller/analytics'),
        GET('/api/seller/analytics/sales?days=7'),
      ]);
      setAnalytics(anaRes.data);
      setSalesData(salesRes.data.salesData);
    } catch (e) { console.error(e); }
    finally { setLoadingAna(false); }
  };

  const fetchProducts = async () => {
    setLoadingProd(true);
    try { const r = await GET('/api/seller/products'); setProducts(r.data.products); }
    catch (e) { console.error(e); } finally { setLoadingProd(false); }
  };

  const fetchOrders = async () => {
    setLoadingOrd(true);
    try {
      const url = orderFilter ? \`/api/seller/orders?status=\${orderFilter}\` : '/api/seller/orders';
      const r = await GET(url);
      setOrders(r.data.orders);
    } catch (e) { console.error(e); } finally { setLoadingOrd(false); }
  };

  const fetchWallet = async () => {
    try { const r = await GET('/api/seller/wallet'); setWallet(r.data); } catch (e) { console.error(e); }
  };

  const fetchStore = async () => {
    try {
      const r = await GET('/api/seller/store');
      setStore(r.data.store);
      setStoreForm(r.data.store);
    } catch (e) { console.error(e); }
  };

  const fetchAds = async () => {
    try {
      const [adsRes, anaRes] = await Promise.all([GET('/api/seller/ads'), GET('/api/seller/ads/analytics')]);
      setAds(adsRes.data.ads);
      setAdAnalytics(anaRes.data);
    } catch (e) { console.error(e); }
  };

  // ── Product handlers ──────────────────────────────────────────────────────
  const openAddProduct = () => {
    setEditProduct(null);
    setProdForm({ title: '', description: '', price: '', campus: user?.campus || '', condition: 'NEW', stock: '1', isActive: true, images: [{ url: '', isPrimary: true }] });
    setShowProdForm(true);
  };

  const openEditProduct = (p: any) => {
    setEditProduct(p);
    setProdForm({ title: p.title, description: p.description || '', price: String(p.price), campus: p.campus, condition: p.condition, stock: String(p.stock), isActive: p.isActive, images: p.images?.length ? p.images : [{ url: '', isPrimary: true }] });
    setShowProdForm(true);
  };

  const saveProduct = async () => {
    setSavingProd(true);
    try {
      const body = { ...prodForm, price: parseFloat(prodForm.price), stock: parseInt(prodForm.stock), images: prodForm.images.filter(i => i.url) };
      if (editProduct) { await PUT(\`/api/seller/products/\${editProduct.id}\`, body); showToast('Product updated!'); }
      else             { await POST('/api/seller/products', body); showToast('Product created!'); }
      setShowProdForm(false);
      fetchProducts();
    } catch (err: any) { showToast(err.message || 'Failed to save product', 'error'); }
    finally { setSavingProd(false); }
  };

  const toggleProduct = async (p: any) => {
    try {
      await PUT(\`/api/seller/products/\${p.id}\`, { isActive: !p.isActive });
      fetchProducts();
      showToast(p.isActive ? 'Product hidden from marketplace' : 'Product visible on marketplace');
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Remove this product from the marketplace?')) return;
    try { await DEL(\`/api/seller/products/\${id}\`); fetchProducts(); showToast('Product removed'); }
    catch (err: any) { showToast(err.message, 'error'); }
  };

  // ── Order handlers ────────────────────────────────────────────────────────
  const updateOrderStatus = async (orderId: string, currentStatus: string) => {
    const nextStatus = STATUS_FLOW[currentStatus];
    if (!nextStatus) return;
    setUpdatingOrd(orderId);
    try {
      await PUT(\`/api/seller/orders/\${orderId}/status\`, { status: nextStatus });
      fetchOrders();
      fetchAnalytics();
      showToast(\`Order marked as \${nextStatus.replace(/_/g, ' ')}\`);
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setUpdatingOrd(null); }
  };

  const cancelOrder = async (orderId: string) => {
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    try {
      await PUT(\`/api/seller/orders/\${orderId}/cancel\`, { reason });
      fetchOrders();
      showToast('Order cancelled and buyer refunded');
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  // ── Payout handler ────────────────────────────────────────────────────────
  const requestPayout = async () => {
    const amt = parseFloat(payoutAmt);
    if (!amt || amt < 100) { setPayoutMsg('Minimum payout is KSH 100'); return; }
    setPayingOut(true);
    try {
      await POST('/api/seller/wallet/withdraw', { amount: amt, phone: payoutPhone });
      setPayoutMsg(\`KSH \${amt.toLocaleString()} payout requested! Processing in 1-2 days.\`);
      setPayoutAmt('');
      fetchWallet();
    } catch (err: any) { setPayoutMsg(err.message); }
    finally { setPayingOut(false); }
  };

  // ── Store save ────────────────────────────────────────────────────────────
  const saveStore = async () => {
    setSavingStore(true);
    try {
      await PUT('/api/seller/store', storeForm);
      setStoreMsg('Store updated successfully!');
      setTimeout(() => setStoreMsg(''), 3000);
    } catch (err: any) { setStoreMsg(err.message); }
    finally { setSavingStore(false); }
  };

  // ── Create Ad ─────────────────────────────────────────────────────────────
  const createAd = async () => {
    setSavingAd(true);
    try {
      await POST('/api/seller/ads', { ...adForm, budget: parseFloat(adForm.budget) });
      showToast('Ad submitted for review!');
      setShowAdForm(false);
      fetchAds();
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setSavingAd(false); }
  };

  const navItems: { id: Tab; icon: any; label: string }[] = [
    { id: 'overview',  icon: LayoutDashboard, label: 'Overview' },
    { id: 'products',  icon: Package,         label: 'Products' },
    { id: 'orders',    icon: ShoppingCart,    label: 'Orders' },
    { id: 'wallet',    icon: Wallet,          label: 'Wallet' },
    { id: 'store',     icon: Store,           label: 'Store' },
    { id: 'ads',       icon: Megaphone,       label: 'Ads' },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* Toast */}
      {toast && (
        <div className={\`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 max-w-sm \${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}\`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-pink-100 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.campus}</p>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="hidden md:flex items-center gap-1 bg-pink-50 border border-pink-100 rounded-xl p-1">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={\`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all \${tab === n.id ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:text-gray-800'}\`}>
                <n.icon className="w-3.5 h-3.5" /> {n.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:block text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
              KSH {(analytics?.revenue?.total ?? 0).toLocaleString()}
            </span>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1 mt-2 overflow-x-auto pb-1">
          {navItems.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={\`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all \${tab === n.id ? 'bg-pink-500 text-white' : 'bg-pink-50 text-gray-600 border border-pink-200'}\`}>
              <n.icon className="w-3 h-3" /> {n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">

        {/* ══ OVERVIEW ════════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Overview</h1>
                <p className="text-gray-400 text-sm mt-0.5">
                  {analytics?.orders?.pending > 0 ? \`⚠️ \${analytics.orders.pending} orders need attention\` : 'All caught up!'}
                </p>
              </div>
              <button onClick={() => { setTab('products'); openAddProduct(); }}
                className="bg-pink-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-pink-600 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {/* Stats */}
            {loadingAna ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({length:4}).map((_,i)=><div key={i} className="h-28 bg-pink-50 rounded-2xl animate-pulse border border-pink-100" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue',    value: \`KSH \${(analytics?.revenue?.total ?? 0).toLocaleString()}\`,    icon: DollarSign, color: 'text-green-600',  sub: \`KSH \${(analytics?.revenue?.month ?? 0).toLocaleString()} this month\` },
                  { label: 'Active Products',  value: analytics?.products?.active ?? 0,                                  icon: Package,    color: 'text-pink-600',   sub: \`\${analytics?.products?.total ?? 0} total\` },
                  { label: 'Total Orders',     value: analytics?.orders?.total ?? 0,                                     icon: ShoppingCart,color:'text-blue-600',   sub: \`\${analytics?.orders?.pending ?? 0} pending\` },
                  { label: 'Customers',        value: analytics?.customers ?? 0,                                         icon: Users,      color: 'text-purple-600', sub: \`\${analytics?.orders?.delivered ?? 0} completed\` },
                ].map((s, i) => (
                  <div key={i} className="bg-pink-50 border border-pink-100 p-5 rounded-2xl">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-white rounded-lg"><s.icon className={\`w-4 h-4 \${s.color}\`} /></div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales chart */}
              <div className="lg:col-span-2 bg-pink-50 border border-pink-100 rounded-2xl p-5">
                <h3 className="font-bold mb-4">Sales — Last 7 Days</h3>
                {salesData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No sales data yet</div>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#ec4899" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fbcfe8" vertical={false} />
                        <XAxis dataKey="date" stroke="#ec4899" tick={{ fill: '#ec4899', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
                        <YAxis stroke="#ec4899" tick={{ fill: '#ec4899', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => \`\${v/1000}k\`} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#fbcfe8', borderRadius: '8px' }} formatter={(v: any) => [\`KSH \${v.toLocaleString()}\`, 'Revenue']} />
                        <Area type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} fill="url(#grad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Pending orders */}
              <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Pending Orders</h3>
                  {analytics?.orders?.pending > 0 && (
                    <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{analytics.orders.pending} new</span>
                  )}
                </div>
                {(analytics?.recentOrders ?? []).filter((o: any) => o.status === 'PENDING').slice(0, 4).map((order: any) => (
                  <div key={order.id} className="bg-white border border-pink-100 p-3 rounded-xl flex items-center gap-3 mb-2 hover:border-pink-300 transition-colors">
                    <div className="w-10 h-10 bg-pink-50 rounded-lg overflow-hidden flex-shrink-0">
                      {order.items?.[0]?.product?.images?.[0]?.url
                        ? <img src={order.items[0].product.images[0].url} className="w-full h-full object-cover" />
                        : <Package className="w-5 h-5 text-pink-300 m-auto mt-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate">{order.items?.[0]?.product?.title}</p>
                      <p className="text-[10px] text-gray-400">#{order.id.slice(-6).toUpperCase()} · KSH {order.total.toLocaleString()}</p>
                    </div>
                    <button onClick={() => setTab('orders')} className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-pink-600">
                      View
                    </button>
                  </div>
                ))}
                {(analytics?.orders?.pending ?? 0) === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">No pending orders</div>
                )}
                <button onClick={() => setTab('orders')} className="w-full mt-3 py-2 border-2 border-dashed border-pink-200 rounded-xl text-xs font-bold text-pink-500 hover:bg-pink-50 transition-colors">
                  View All Orders →
                </button>
              </div>
            </div>

            {/* Top products */}
            {analytics?.topProducts?.length > 0 && (
              <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5">
                <h3 className="font-bold mb-4">Top Products</h3>
                <div className="space-y-3">
                  {analytics.topProducts.map((tp: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 bg-white border border-pink-100 rounded-xl p-3">
                      <span className="text-sm font-bold text-gray-400 w-5">#{i+1}</span>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-pink-50 flex-shrink-0">
                        {tp.product?.images?.[0]?.url
                          ? <img src={tp.product.images[0].url} className="w-full h-full object-cover" />
                          : <Package className="w-5 h-5 text-pink-300 m-auto mt-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{tp.product?.title}</p>
                        <p className="text-xs text-gray-400">{tp._sum?.quantity} sold</p>
                      </div>
                      <p className="font-bold text-sm text-pink-600">KSH {(tp._sum?.price ?? 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ PRODUCTS ════════════════════════════════════════════════════════ */}
        {tab === 'products' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Products</h2>
              <button onClick={openAddProduct}
                className="bg-pink-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-pink-600 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {loadingProd ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({length:8}).map((_,i)=><div key={i} className="h-52 bg-pink-50 rounded-2xl animate-pulse border border-pink-100" />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-pink-50 rounded-2xl border border-pink-100">
                <Package className="w-12 h-12 text-pink-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">No products yet</p>
                <button onClick={openAddProduct} className="mt-4 bg-pink-500 text-white text-sm font-bold px-6 py-2 rounded-xl hover:bg-pink-600 transition-colors">
                  Add Your First Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => (
                  <div key={p.id} className={\`bg-white border rounded-2xl overflow-hidden transition-all \${p.isActive ? 'border-pink-100' : 'border-gray-200 opacity-60'}\`}>
                    <div className="relative aspect-square bg-pink-50 overflow-hidden">
                      {p.images?.[0]?.url
                        ? <img src={p.images[0].url} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-pink-200" /></div>}
                      <div className="absolute top-2 left-2">
                        <span className={\`text-[10px] font-bold px-1.5 py-0.5 rounded-md \${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock <= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}\`}>
                          {p.stock === 0 ? 'Out of Stock' : \`Stock: \${p.stock}\`}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm truncate">{p.title}</p>
                      <p className="font-bold text-pink-500 text-sm mt-0.5">KSH {p.price.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <button onClick={() => openEditProduct(p)} className="flex-1 py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-xs font-semibold text-gray-700 hover:bg-pink-100 flex items-center justify-center gap-1">
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => toggleProduct(p)} className={\`p-1.5 rounded-lg border transition-colors \${p.isActive ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-400'}\`} title={p.isActive ? 'Hide' : 'Show'}>
                          {p.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Product Form Modal */}
            {showProdForm && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowProdForm(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b border-pink-100">
                    <h3 className="font-bold text-lg">{editProduct ? 'Edit Product' : 'Add Product'}</h3>
                    <button onClick={() => setShowProdForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    {[
                      { key: 'title',       label: 'Product Title',  type: 'text',   placeholder: 'e.g. Air Jordan 4 Retro' },
                      { key: 'price',       label: 'Price (KSH)',    type: 'number', placeholder: '0' },
                      { key: 'stock',       label: 'Stock Quantity', type: 'number', placeholder: '1' },
                      { key: 'campus',      label: 'Campus',         type: 'text',   placeholder: 'e.g. JKUAT Main' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
                        <input type={f.type} value={(prodForm as any)[f.key]} placeholder={f.placeholder}
                          onChange={e => setProdForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full bg-pink-50 border border-pink-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-pink-500" />
                      </div>
                    ))}

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Condition</label>
                      <div className="grid grid-cols-4 gap-2">
                        {CONDITIONS.map(c => (
                          <button key={c} onClick={() => setProdForm(p => ({ ...p, condition: c }))}
                            className={\`py-2 rounded-xl text-xs font-bold border transition-all \${prodForm.condition === c ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white border-pink-200 text-gray-600'}\`}>
                            {c.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                      <textarea value={prodForm.description} rows={3}
                        onChange={e => setProdForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Describe your product..."
                        className="w-full bg-pink-50 border border-pink-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-pink-500 resize-none" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product Image URL</label>
                      <input type="url" value={prodForm.images[0]?.url || ''}
                        onChange={e => setProdForm(p => ({ ...p, images: [{ url: e.target.value, isPrimary: true }] }))}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-pink-50 border border-pink-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-pink-500" />
                      {prodForm.images[0]?.url && (
                        <img src={prodForm.images[0].url} className="mt-2 w-20 h-20 object-cover rounded-xl border border-pink-200" onError={e => (e.currentTarget.style.display = 'none')} />
                      )}
                    </div>

                    <button onClick={saveProduct} disabled={savingProd || !prodForm.title || !prodForm.price}
                      className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {savingProd ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {savingProd ? 'Saving...' : editProduct ? 'Update Product' : 'Create Product'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ ORDERS ══════════════════════════════════════════════════════════ */}
        {tab === 'orders' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-bold">Orders</h2>
              <div className="flex gap-2 flex-wrap">
                {['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map(s => (
                  <button key={s} onClick={() => setOrderFilter(s)}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all \${orderFilter === s ? 'bg-pink-500 text-white border-pink-500' : 'bg-white border-pink-200 text-gray-600 hover:border-pink-400'}\`}>
                    {s || 'All'}
                  </button>
                ))}
              </div>
            </div>

            {loadingOrd ? (
              <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-20 bg-pink-50 rounded-2xl animate-pulse border border-pink-100" />)}</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 bg-pink-50 rounded-2xl border border-pink-100">
                <ShoppingCart className="w-12 h-12 text-pink-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">No orders {orderFilter ? \`with status \${orderFilter}\` : 'yet'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-white border border-pink-100 rounded-2xl p-4 hover:border-pink-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-pink-50 flex-shrink-0">
                          {order.items?.[0]?.product?.images?.[0]?.url
                            ? <img src={order.items[0].product.images[0].url} className="w-full h-full object-cover" />
                            : <Package className="w-6 h-6 text-pink-300 m-auto mt-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                            <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${STATUS_COLOR[order.status]}\`}>{order.status.replace(/_/g,' ')}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{order.buyer?.name} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-KE')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <p className="font-bold text-sm text-pink-600">KSH {order.total.toLocaleString()}</p>
                        <div className="flex gap-1">
                          {STATUS_FLOW[order.status] && (
                            <button
                              onClick={() => updateOrderStatus(order.id, order.status)}
                              disabled={updatingOrd === order.id}
                              className="bg-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-1 disabled:opacity-60">
                              {updatingOrd === order.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
                              {STATUS_LABEL[order.status]}
                            </button>
                          )}
                          {['PENDING', 'CONFIRMED'].includes(order.status) && (
                            <button onClick={() => cancelOrder(order.id)}
                              className="bg-red-50 border border-red-200 text-red-500 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {order.items?.length > 1 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {order.items.slice(1).map((item: any, i: number) => (
                          <span key={i} className="text-[10px] bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full text-gray-500">{item.product?.title}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ WALLET ══════════════════════════════════════════════════════════ */}
        {tab === 'wallet' && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-xl font-bold">Seller Wallet</h2>

            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-2xl p-5">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-green-600">KSH {(wallet.balance ?? 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Ready to withdraw</p>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-200 rounded-2xl p-5">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Total Earned</p>
                <p className="text-3xl font-bold text-pink-600">KSH {(analytics?.revenue?.total ?? 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">All time</p>
              </div>
            </div>

            {/* Payout form */}
            <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold">Request Payout</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Amount (KSH)</label>
                  <input type="number" value={payoutAmt} onChange={e => setPayoutAmt(e.target.value)} placeholder="Min KSH 100"
                    className="w-full bg-white border border-pink-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-pink-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">M-Pesa Number</label>
                  <input type="tel" value={payoutPhone} onChange={e => setPayoutPhone(e.target.value)} placeholder="07XX XXX XXX"
                    className="w-full bg-white border border-pink-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-pink-500" />
                </div>
              </div>
              {payoutMsg && <p className={\`text-sm \${payoutMsg.includes('KSH') ? 'text-green-600' : 'text-red-500'}\`}>{payoutMsg}</p>}
              <button onClick={requestPayout} disabled={payingOut || !payoutAmt || !payoutPhone}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {payingOut ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                {payingOut ? 'Processing...' : \`Withdraw KSH \${parseFloat(payoutAmt||'0').toLocaleString()} via M-Pesa\`}
              </button>
            </div>

            {/* Transactions */}
            <div className="bg-pink-50 border border-pink-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-pink-100">
                <h3 className="font-bold">Transaction History</h3>
              </div>
              {wallet.transactions?.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No transactions yet</div>
              ) : (
                wallet.transactions?.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3 border-b border-pink-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold">{tx.description || tx.type}</p>
                      <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString('en-KE')}</p>
                    </div>
                    <span className={\`font-bold text-sm \${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}\`}>
                      {tx.amount > 0 ? '+' : ''}KSH {Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ STORE ═══════════════════════════════════════════════════════════ */}
        {tab === 'store' && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-xl font-bold">Store Settings</h2>
            {storeMsg && <div className={\`p-3 rounded-xl text-sm font-medium \${storeMsg.includes('success') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}\`}>{storeMsg}</div>}
            {store && (
              <div className="space-y-4">
                {[
                  { key: 'name',           label: 'Store Name',        type: 'text',     placeholder: 'Your Store Name' },
                  { key: 'description',    label: 'Store Description', type: 'textarea', placeholder: 'What do you sell?' },
                  { key: 'banner',         label: 'Banner Image URL',  type: 'url',      placeholder: 'https://...' },
                  { key: 'logo',           label: 'Logo Image URL',    type: 'url',      placeholder: 'https://...' },
                  { key: 'returnPolicy',   label: 'Return Policy',     type: 'textarea', placeholder: 'e.g. No returns after 24hrs' },
                  { key: 'deliveryPolicy', label: 'Delivery Policy',   type: 'textarea', placeholder: 'e.g. Delivery within campus only' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                    {f.type === 'textarea' ? (
                      <textarea value={storeForm[f.key] || ''} rows={3} placeholder={f.placeholder}
                        onChange={e => setStoreForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-pink-50 border border-pink-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-pink-500 resize-none" />
                    ) : (
                      <input type={f.type} value={storeForm[f.key] || ''} placeholder={f.placeholder}
                        onChange={e => setStoreForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-pink-50 border border-pink-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-pink-500" />
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between bg-pink-50 border border-pink-200 rounded-xl p-4">
                  <div>
                    <p className="text-sm font-semibold">Store Status</p>
                    <p className="text-xs text-gray-400">{storeForm.vacationMode ? 'On vacation — store hidden' : 'Open for business'}</p>
                  </div>
                  <button onClick={() => setStoreForm((p: any) => ({ ...p, vacationMode: !p.vacationMode }))}
                    className={\`relative w-12 h-6 rounded-full transition-colors \${storeForm.vacationMode ? 'bg-gray-300' : 'bg-green-500'}\`}>
                    <div className={\`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform \${storeForm.vacationMode ? 'left-0.5' : 'left-6'}\`} />
                  </button>
                </div>

                <button onClick={saveStore} disabled={savingStore}
                  className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {savingStore ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingStore ? 'Saving...' : 'Save Store Settings'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ ADS ═════════════════════════════════════════════════════════════ */}
        {tab === 'ads' && (
          <div className="space-y-6">
            {/* Hero */}
            <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-pink-300/20 rounded-full blur-3xl" />
              <div>
                <p className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-2">Boost Visibility</p>
                <h2 className="text-2xl font-black text-gray-900">Reach 50,000+ Students Daily</h2>
                <p className="text-gray-500 text-sm mt-1">Target specific campuses. Get more orders.</p>
              </div>
              <button onClick={() => setShowAdForm(true)}
                className="bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-pink-600 transition-colors flex items-center gap-2 flex-shrink-0">
                <Plus className="w-4 h-4" /> Create Campaign
              </button>
            </div>

            {/* Analytics */}
            {adAnalytics && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Impressions', value: adAnalytics.totals?.impressions ?? 0 },
                  { label: 'Clicks',      value: adAnalytics.totals?.clicks ?? 0 },
                  { label: 'CTR',         value: \`\${adAnalytics.totals?.ctr ?? '0.00'}%\` },
                ].map((s, i) => (
                  <div key={i} className="bg-pink-50 border border-pink-100 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ads list */}
            {ads.length === 0 ? (
              <div className="text-center py-16 bg-pink-50 rounded-2xl border border-pink-100">
                <Megaphone className="w-12 h-12 text-pink-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">No campaigns yet</p>
                <button onClick={() => setShowAdForm(true)} className="mt-4 bg-pink-500 text-white text-sm font-bold px-6 py-2 rounded-xl hover:bg-pink-600 transition-colors">
                  Create Your First Ad
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {ads.map(ad => (
                  <div key={ad.id} className="bg-white border border-pink-100 rounded-2xl p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{ad.title}</p>
                        <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${ad.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : ad.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}\`}>{ad.status}</span>
                      </div>
                      {ad.targetCampus && <p className="text-xs text-gray-400 mt-0.5">📍 {ad.targetCampus}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span>👁 {ad.impressions}</span>
                        <span>🖱 {ad.clicks}</span>
                        <span>💰 KSH {ad.budget.toLocaleString()} budget</span>
                      </div>
                    </div>
                    <button onClick={async () => { await DEL(\`/api/seller/ads/\${ad.id}\`); fetchAds(); }} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Ad Form Modal */}
            {showAdForm && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAdForm(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b border-pink-100">
                    <h3 className="font-bold">Create Ad Campaign</h3>
                    <button onClick={() => setShowAdForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    {[
                      { key: 'title',        label: 'Campaign Title',    placeholder: 'e.g. Summer Sale - Sneakers' },
                      { key: 'description',  label: 'Ad Description',    placeholder: 'What are you promoting?' },
                      { key: 'targetCampus', label: 'Target Campus',      placeholder: 'e.g. JKUAT Main (leave blank for all)' },
                      { key: 'budget',       label: 'Budget (KSH)',       placeholder: 'Min KSH 100', type: 'number' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
                        <input type={f.type || 'text'} value={(adForm as any)[f.key]} placeholder={f.placeholder}
                          onChange={e => setAdForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full bg-pink-50 border border-pink-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-pink-500" />
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                      Budget will be deducted from your seller balance. Ads are reviewed within 24 hours.
                    </p>
                    <button onClick={createAd} disabled={savingAd || !adForm.title || !adForm.budget}
                      className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {savingAd ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                      {savingAd ? 'Submitting...' : 'Submit Campaign'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
`);

console.log('\n=============================================');
console.log('  ✅ Seller Dashboard connected!');
console.log('');
console.log('  Tabs:');
console.log('  Overview  — Live stats, sales chart, pending orders');
console.log('  Products  — Full CRUD, toggle visibility, stock badge');
console.log('  Orders    — Status updates, cancel, filter by status');
console.log('  Wallet    — Balance, payout request, transactions');
console.log('  Store     — Name, bio, banner, policies, vacation mode');
console.log('  Ads       — Create campaigns, analytics, delete');
console.log('=============================================\n');