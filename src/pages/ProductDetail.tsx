import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Heart, ShoppingCart, MessageCircle, Star, Package,
  ChevronLeft, ChevronRight, Phone, Share2, AlertCircle, Wallet, Smartphone,
  Plus, Minus, CheckCircle2, X, Zap, Truck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GET, POST, DEL } from '../lib/api';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  campus: string;
  condition: string;
  stock: number;
  views: number;
  rating: number | null;
  reviewCount: number;
  images: { url: string; isPrimary: boolean }[];
  category: { name: string; slug: string; icon: string } | null;
  seller: { id: string; name: string; campus: string; avatar: string | null; phone?: string; isVerified?: boolean };
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  buyer: { name: string; avatar: string | null };
}

const CONDITION_STYLES: Record<string, string> = {
  NEW:           'bg-green-100 text-green-700',
  SLIGHTLY_USED: 'bg-blue-100 text-blue-700',
  USED:          'bg-yellow-100 text-yellow-700',
  THRIFTED:      'bg-purple-100 text-purple-700',
};
const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New', SLIGHTLY_USED: 'Slightly Used', USED: 'Used', THRIFTED: 'Thrifted',
};

const DELIVERY_FEE = 100;

/* ─── Order Sheet ─────────────────────────────────────────────────────────── */
function OrderSheet({
  product,
  walletBalance,
  onClose,
}: {
  product: Product;
  walletBalance: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [qty,       setQty]       = useState(1);
  const [method,    setMethod]    = useState<'WALLET' | 'MPESA'>('WALLET');
  const [phone,     setPhone]     = useState('');
  const [placing,   setPlacing]   = useState(false);
  const [error,     setError]     = useState('');
  const [orderId,   setOrderId]   = useState('');

  const subtotal = product.price * qty;
  const total    = subtotal + DELIVERY_FEE;
  const canWallet = walletBalance >= total;

  const handleOrder = async () => {
    setError('');
    if (method === 'MPESA' && !phone.trim()) {
      setError('Enter your M-Pesa phone number.');
      return;
    }
    setPlacing(true);
    try {
      const res = await POST('/api/buyer/orders', {
        items: [{ productId: product.id, quantity: qty }],
        paymentMethod: method,
      });
      const id = res.data.orders?.[0]?.id ?? res.data.order?.id ?? 'N/A';
      setOrderId(id.slice(-6).toUpperCase());
    } catch (e: any) {
      setError(e.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  /* ── Success screen ── */
  if (orderId) return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 className="w-9 h-9 text-green-500" />
      </div>
      <h3 className="font-black text-xl text-gray-900 mb-1">Order Placed! 🎉</h3>
      <p className="text-sm text-gray-500 mb-1">Order <span className="font-bold text-gray-700">#{orderId}</span></p>
      {method === 'WALLET' && (
        <p className="text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full mt-1 font-medium">
          KSH {total.toLocaleString()} deducted from wallet
        </p>
      )}
      {method === 'MPESA' && (
        <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full mt-1 font-medium">
          Complete payment via M-Pesa prompt on {phone}
        </p>
      )}
      <div className="flex gap-3 w-full mt-6">
        <button onClick={onClose}
          className="flex-1 py-3 rounded-2xl border border-pink-200 text-gray-700 font-bold text-sm hover:bg-pink-50 transition-colors">
          Keep Shopping
        </button>
        <button onClick={() => { onClose(); navigate('/dashboard/buyer?tab=orders'); }}
          className="flex-1 py-3 rounded-2xl bg-pink-500 text-white font-bold text-sm hover:bg-pink-600 transition-colors">
          View Orders
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      {/* Product summary */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-pink-50 flex-shrink-0">
          {product.images[0]?.url
            ? <img src={product.images[0].url} alt={product.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-pink-200" /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 truncate">{product.title}</p>
          <p className="text-pink-500 font-black text-base">KSH {product.price.toLocaleString()}</p>
        </div>
        <span className="text-xs text-gray-400">{product.stock} left</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Qty picker */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-gray-700">Quantity</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-8 h-8 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center disabled:opacity-40 hover:bg-pink-100 transition-colors"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <span className="w-8 text-center font-black text-base text-gray-900">{qty}</span>
            <button
              onClick={() => setQty(q => Math.min(product.stock, q + 1))}
              disabled={qty >= product.stock}
              className="w-8 h-8 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center disabled:opacity-40 hover:bg-pink-100 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="bg-gray-50 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Subtotal ({qty} × KSH {product.price.toLocaleString()})</span>
            <span className="font-semibold text-gray-700">KSH {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Delivery fee</span>
            <span className="font-semibold text-gray-700">KSH {DELIVERY_FEE.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-black text-pink-500 text-lg">KSH {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="font-semibold text-sm text-gray-700 mb-2">Pay with</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod('WALLET')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                method === 'WALLET'
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 bg-white hover:border-pink-200'
              }`}
            >
              <Wallet className={`w-5 h-5 ${method === 'WALLET' ? 'text-pink-500' : 'text-gray-400'}`} />
              <span className={`text-xs font-bold ${method === 'WALLET' ? 'text-pink-600' : 'text-gray-500'}`}>Wallet</span>
              <span className={`text-[10px] font-semibold ${canWallet ? 'text-green-600' : 'text-red-500'}`}>
                KSH {walletBalance.toLocaleString()}
              </span>
            </button>
            <button
              onClick={() => setMethod('MPESA')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                method === 'MPESA'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-green-200'
              }`}
            >
              <Smartphone className={`w-5 h-5 ${method === 'MPESA' ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-bold ${method === 'MPESA' ? 'text-green-700' : 'text-gray-500'}`}>M-Pesa</span>
              <span className="text-[10px] text-gray-400">STK Push</span>
            </button>
          </div>

          {/* Wallet warning */}
          {method === 'WALLET' && !canWallet && (
            <div className="mt-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-red-600 font-medium">Insufficient balance</p>
                <p className="text-[10px] text-red-400">Need KSH {(total - walletBalance).toLocaleString()} more</p>
              </div>
              <button
                onClick={() => { onClose(); navigate('/wallet'); }}
                className="flex-shrink-0 text-[11px] font-bold text-pink-500 border border-pink-200 px-2 py-1 rounded-lg bg-white"
              >
                Top Up
              </button>
            </div>
          )}

          {/* M-Pesa phone */}
          {method === 'MPESA' && (
            <div className="mt-2">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 0712 345 678"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Place order */}
        <button
          onClick={handleOrder}
          disabled={placing || product.stock === 0 || (method === 'WALLET' && !canWallet)}
          className="w-full py-3.5 rounded-2xl bg-pink-500 text-white font-black text-sm hover:bg-pink-600 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {placing ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
          ) : (
            <><Zap className="w-4 h-4" /> Place Order · KSH {total.toLocaleString()}</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product,     setProduct]     = useState<Product | null>(null);
  const [reviews,     setReviews]     = useState<Review[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [imgIdx,      setImgIdx]      = useState(0);
  const [inWishlist,  setInWishlist]  = useState(false);
  const [inCart,      setInCart]      = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error,       setError]       = useState('');
  const [walletBal,   setWalletBal]   = useState(user?.walletBalance ?? 0);
  const [showOrder,   setShowOrder]   = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [prodRes, wishRes, cartRes] = await Promise.all([
          GET(`/api/products/${id}`),
          user ? GET('/api/buyer/wishlist').catch(() => null) : Promise.resolve(null),
          user ? GET('/api/buyer/cart').catch(() => null)     : Promise.resolve(null),
        ]);
        setProduct(prodRes.data.product ?? prodRes.data);
        if (wishRes) {
          const ids = (wishRes.data.items ?? []).map((i: any) => i.productId);
          setInWishlist(ids.includes(id));
        }
        if (cartRes) {
          const ids = (cartRes.data.items ?? []).map((i: any) => i.productId);
          setInCart(ids.includes(id));
        }
        try { const r = await GET(`/api/products/${id}/reviews`); setReviews(r.data.reviews ?? []); } catch {}
        if (user) {
          try { const w = await GET('/api/buyer/wallet'); setWalletBal(w.data.balance ?? 0); } catch {}
        }
      } catch { setError('Product not found or unavailable.'); }
      finally { setLoading(false); }
    };
    load();
  }, [id, user]);

  const toggleWishlist = async () => {
    if (!user) { navigate('/login'); return; }
    const was = inWishlist;
    setInWishlist(!was);
    try { was ? await DEL(`/api/buyer/wishlist/${id}`) : await POST(`/api/buyer/wishlist/${id}`, {}); }
    catch { setInWishlist(was); }
  };

  const addToCart = async () => {
    if (!user) { navigate('/login'); return; }
    if (inCart) { navigate('/dashboard/buyer?tab=cart'); return; }
    setCartLoading(true);
    try { await POST(`/api/buyer/cart/${id}`, { quantity: 1 }); setInCart(true); }
    catch (e: any) { alert(e.message || 'Failed to add to cart'); }
    finally { setCartLoading(false); }
  };

  const startChat = async () => {
    if (!user) { navigate('/login'); return; }
    setChatLoading(true);
    try { const r = await POST(`/api/chats/${product!.seller.id}`, {}); navigate(`/chats?chatId=${r.data.chat.id}`); }
    catch (e: any) { alert(e.message || 'Could not start chat'); }
    finally { setChatLoading(false); }
  };

  const shareProduct = () => {
    if (navigator.share) navigator.share({ title: product?.title, url: window.location.href }).catch(() => {});
    else navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied!'));
  };

  if (loading) return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 bg-white border-b border-pink-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-pink-50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="h-4 w-32 bg-pink-100 rounded animate-pulse" />
      </div>
      <div className="animate-pulse">
        <div className="aspect-square bg-pink-50" />
        <div className="p-5 space-y-4">
          <div className="h-5 bg-pink-100 rounded w-3/4" />
          <div className="h-7 bg-pink-100 rounded w-1/3" />
          <div className="h-3 bg-pink-100 rounded w-full" />
          <div className="h-3 bg-pink-100 rounded w-5/6" />
        </div>
      </div>
    </div>
  );

  if (error || !product) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <AlertCircle className="w-14 h-14 text-pink-200 mb-4" />
      <p className="font-bold text-lg text-gray-700 mb-1">Product Unavailable</p>
      <p className="text-sm text-gray-400 mb-6">{error || 'This product could not be found.'}</p>
      <button onClick={() => navigate('/explore')}
        className="bg-pink-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-pink-600 transition-colors">
        Back to Explore
      </button>
    </div>
  );

  const isOwner = user?.id === product.seller.id;

  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-pink-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-pink-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-base flex-1 truncate">{product.title}</h1>
        <button onClick={shareProduct} className="p-2 rounded-xl hover:bg-pink-50 transition-colors">
          <Share2 className="w-4 h-4 text-gray-500" />
        </button>
        <button onClick={toggleWishlist}
          className={`p-2 rounded-xl border transition-all ${inWishlist ? 'bg-pink-500 border-pink-500 text-white' : 'border-pink-200 text-gray-500 hover:border-pink-400 hover:text-pink-500'}`}>
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Image carousel */}
      <div className="relative bg-pink-50" style={{ aspectRatio: '1' }}>
        {product.images[imgIdx]?.url ? (
          <img src={product.images[imgIdx].url} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-20 h-20 text-pink-200" />
          </div>
        )}

        <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-lg ${CONDITION_STYLES[product.condition] || 'bg-gray-100 text-gray-600'}`}>
          {CONDITION_LABEL[product.condition] || product.condition}
        </span>

        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 font-bold px-4 py-2 rounded-xl text-sm">Sold Out</span>
          </div>
        )}

        {product.images.length > 1 && (
          <>
            <button onClick={() => setImgIdx(i => (i - 1 + product.images.length) % product.images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setImgIdx(i => (i + 1) % product.images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {product.images.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`rounded-full transition-all ${i === imgIdx ? 'bg-white w-5 h-2' : 'bg-white/50 w-2 h-2'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Details */}
      <div className="p-5 space-y-5 pb-36">
        {/* Title + price */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-snug">{product.title}</h2>
          <p className="text-3xl font-extrabold text-pink-500 mt-1">KSH {product.price.toLocaleString()}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-pink-50 px-2.5 py-1.5 rounded-full border border-pink-100">
              <MapPin className="w-3 h-3 text-pink-400" /> {product.campus}
            </span>
            {product.category && (
              <span className="text-xs bg-pink-50 text-gray-600 px-2.5 py-1.5 rounded-full border border-pink-100">
                {product.category.icon} {product.category.name}
              </span>
            )}
            {product.rating != null && (
              <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1.5 rounded-full border border-yellow-100">
                <Star className="w-3 h-3 fill-current" />
                {product.rating.toFixed(1)} ({product.reviewCount})
              </span>
            )}
            <span className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1.5 rounded-full border border-gray-100">
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="font-bold text-sm text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
          </div>
        )}

        {/* Seller card */}
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-gray-700 mb-3">Seller Information</h3>
          <div className="flex items-center gap-3">
            {product.seller.avatar
              ? <img src={product.seller.avatar} alt={product.seller.name} className="w-12 h-12 rounded-full object-cover border-2 border-pink-200 flex-shrink-0" />
              : <div className="w-12 h-12 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-base flex-shrink-0">
                  {product.seller.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-gray-900">{product.seller.name}</p>
                {product.seller.isVerified && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Verified</span>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-pink-400" /> {product.seller.campus}
              </p>
            </div>
          </div>

          {!isOwner && (
            <div className="flex gap-2 mt-4">
              <button onClick={startChat} disabled={chatLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-pink-500 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-pink-600 transition-colors disabled:opacity-60">
                <MessageCircle className="w-4 h-4" />
                {chatLoading ? 'Opening…' : 'Chat with Seller'}
              </button>
              {product.seller.phone && (
                <a href={`tel:${product.seller.phone}`}
                  className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-green-100 transition-colors">
                  <Phone className="w-4 h-4" /> Call
                </a>
              )}
            </div>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h3 className="font-bold text-sm text-gray-700 mb-3">Reviews ({reviews.length})</h3>
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="border border-pink-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {review.buyer.avatar
                      ? <img src={review.buyer.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      : <div className="w-7 h-7 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-xs">{review.buyer.name[0]}</div>
                    }
                    <span className="font-semibold text-xs text-gray-700">{review.buyer.name}</span>
                    <div className="flex items-center gap-0.5 ml-auto">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-xs text-gray-600 leading-relaxed">{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom action bar ── */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-pink-100 p-3 flex gap-2 max-w-2xl mx-auto">
          <button onClick={toggleWishlist}
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all ${inWishlist ? 'bg-pink-500 border-pink-500 text-white' : 'border-pink-200 text-gray-500 hover:border-pink-400'}`}>
            <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={addToCart}
            disabled={product.stock === 0 || cartLoading}
            className={`flex items-center justify-center gap-1.5 font-bold text-sm py-3 px-4 rounded-2xl transition-all disabled:opacity-60 border ${
              inCart
                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                : 'border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {cartLoading ? '…' : inCart ? 'In Cart' : 'Add'}
          </button>
          <button
            onClick={() => { if (!user) { navigate('/login'); return; } setShowOrder(true); }}
            disabled={product.stock === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-pink-500 text-white font-black text-sm py-3 rounded-2xl hover:bg-pink-600 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            {product.stock === 0 ? 'Sold Out' : 'Order Now'}
          </button>
        </div>
      )}

      {/* ── Order sheet (slide-up modal) ── */}
      {showOrder && product && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowOrder(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-2xl mx-auto shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle + title */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-pink-500" />
                <h2 className="font-black text-base">Make Order</h2>
              </div>
              <button onClick={() => setShowOrder(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />

            <OrderSheet
              product={product}
              walletBalance={walletBal}
              onClose={() => setShowOrder(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
