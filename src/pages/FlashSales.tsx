import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, MapPin, Heart, ShoppingCart, Package, Star, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GET, POST, DEL } from '../lib/api';

interface Product {
  id: string;
  title: string;
  price: number;
  campus: string;
  condition: string;
  stock: number;
  rating: number | null;
  reviewCount: number;
  images: { url: string; isPrimary: boolean }[];
  seller: { id: string; name: string };
}

const DISCOUNTS = [20, 30, 40, 50, 15, 25, 35, 45];

const CONDITION_STYLES: Record<string, string> = {
  NEW:           'bg-green-100 text-green-700',
  SLIGHTLY_USED: 'bg-blue-100 text-blue-700',
  USED:          'bg-yellow-100 text-yellow-700',
  THRIFTED:      'bg-purple-100 text-purple-700',
};
const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New', SLIGHTLY_USED: 'S.Used', USED: 'Used', THRIFTED: 'Thrifted',
};

export default function FlashSales() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [products,    setProducts]    = useState<Product[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [timeLeft,    setTimeLeft]    = useState('');
  const [endsAt]                      = useState(() => new Date(Date.now() + 3 * 3600000 + 47 * 60000));

  const [wishlist,    setWishlist]    = useState<Set<string>>(new Set());
  const [cartItems,   setCartItems]   = useState<Set<string>>(new Set());
  const [cartLoading, setCartLoading] = useState<string | null>(null);

  /* countdown */
  useEffect(() => {
    const tick = () => {
      const diff = endsAt.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const fetchProducts = async (p = 1, reset = false) => {
    p === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await GET(`/api/products?sort=popular&page=${p}&limit=12`);
      setProducts(prev => reset || p === 1 ? res.data.products : [...prev, ...res.data.products]);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { fetchProducts(1, true); }, []);

  useEffect(() => {
    if (!user) return;
    GET('/api/buyer/wishlist').then(r => setWishlist(new Set(r.data.items.map((i: any) => i.productId)))).catch(() => {});
    GET('/api/buyer/cart').then(r => setCartItems(new Set(r.data.items.map((i: any) => i.productId)))).catch(() => {});
  }, [user]);

  const toggleWishlist = async (pid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    const was = wishlist.has(pid);
    setWishlist(prev => { const s = new Set(prev); was ? s.delete(pid) : s.add(pid); return s; });
    try { was ? await DEL(`/api/buyer/wishlist/${pid}`) : await POST(`/api/buyer/wishlist/${pid}`, {}); }
    catch { setWishlist(prev => { const s = new Set(prev); was ? s.add(pid) : s.delete(pid); return s; }); }
  };

  const addToCart = async (pid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (cartItems.has(pid)) return;
    setCartLoading(pid);
    try { await POST(`/api/buyer/cart/${pid}`, { quantity: 1 }); setCartItems(prev => new Set([...prev, pid])); }
    catch (e) { console.error(e); }
    finally { setCartLoading(null); }
  };

  return (
    <div className="w-full overflow-x-hidden bg-white min-h-screen">

      {/* Header + banner merged into one scrollable block */}
      <div className="px-3 pt-4 pb-3">
        {/* Back row */}
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-pink-50 transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-pink-500 flex-shrink-0" />
              <span className="font-bold text-base">Flash Sales</span>
            </div>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{total} items</span>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-r from-pink-600 to-pink-400 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-black text-lg leading-tight">Up to 50% Off</p>
            {timeLeft && timeLeft !== 'Ended' && (
              <p className="text-white/80 text-xs mt-0.5 font-mono">⏱ Ends in {timeLeft}</p>
            )}
          </div>
          <Zap className="w-9 h-9 text-white/30 flex-shrink-0" />
        </div>
      </div>

      {/* Grid */}
      <div className="px-2 pb-28 md:pb-10">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-pink-100 animate-pulse">
                <div className="aspect-square bg-pink-100" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-pink-100 rounded w-4/5" />
                  <div className="h-3 bg-pink-100 rounded w-3/5" />
                  <div className="h-4 bg-pink-100 rounded w-2/5 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Zap className="w-12 h-12 text-pink-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">No flash sale items right now</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon for new deals</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {products.map((product, idx) => {
                const image    = product.images.find(i => i.isPrimary)?.url || product.images[0]?.url;
                const discount = DISCOUNTS[idx % DISCOUNTS.length];
                const original = Math.round(product.price * (1 + discount / 100));
                const inCart   = cartItems.has(product.id);
                const inWish   = wishlist.has(product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="bg-white rounded-2xl overflow-hidden border border-pink-100 hover:border-pink-300 active:scale-[0.97] transition-all flex flex-col shadow-sm cursor-pointer"
                  >
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden bg-pink-50">
                      {image
                        ? <img src={image} alt={product.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-pink-200" /></div>
                      }

                      {/* Discount badge */}
                      <span className="absolute top-2 left-2 bg-pink-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                        -{discount}%
                      </span>

                      {/* Condition badge */}
                      <span className={`absolute bottom-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${CONDITION_STYLES[product.condition] || 'bg-gray-100 text-gray-600'}`}>
                        {CONDITION_LABEL[product.condition] || product.condition}
                      </span>

                      {/* Wishlist */}
                      <button
                        onClick={e => toggleWishlist(product.id, e)}
                        className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                          inWish ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white/90 border-pink-100 text-gray-400'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${inWish ? 'fill-current' : ''}`} />
                      </button>

                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-white text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full">Sold Out</span>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-2.5 flex flex-col flex-1">
                      <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">{product.title}</p>
                      <div className="flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3 text-pink-400 flex-shrink-0" />
                        <span className="text-[10px] text-gray-400 truncate">{product.campus}</span>
                      </div>
                      {product.rating != null && (
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-[10px] text-gray-500">{product.rating}</span>
                        </div>
                      )}
                      <div className="mt-auto pt-1.5 border-t border-pink-50 flex items-center justify-between gap-1">
                        <div>
                          <p className="font-black text-pink-500 text-xs leading-none">KSH {product.price.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 line-through">KSH {original.toLocaleString()}</p>
                        </div>
                        <button
                          onClick={e => addToCart(product.id, e)}
                          disabled={product.stock === 0 || cartLoading === product.id || inCart}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 ${
                            inCart ? 'bg-green-500 border-green-500 text-white'
                            : cartLoading === product.id ? 'bg-pink-100 border-pink-200 text-pink-400'
                            : 'bg-pink-50 border-pink-200 text-gray-500 hover:bg-pink-500 hover:text-white hover:border-pink-500'
                          } disabled:opacity-60`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {page < totalPages && (
              <button
                onClick={() => fetchProducts(page + 1)}
                disabled={loadingMore}
                className="mt-5 w-full py-3 rounded-xl bg-pink-50 border border-pink-200 text-sm font-semibold text-gray-700 hover:bg-pink-100 transition-colors disabled:opacity-60"
              >
                {loadingMore ? 'Loading…' : `Load More (${total - products.length} left)`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
