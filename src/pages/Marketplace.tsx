
import { MapPin, Heart, ShoppingCart, Search, Star, Package, X, ChevronDown, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GET, POST, DEL } from '../lib/api';
import FlashSaleStories from '../components/FlashSaleStories';

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
  category: { name: string; slug: string; icon: string } | null;
  seller: { id: string; name: string; campus: string; avatar: string | null };
}

const CATEGORIES = [
  { label: 'All',             slug: '',              icon: '🏪' },
  { label: 'Sneakers & Drip', slug: 'sneakers-drip', icon: '👟' },
  { label: 'Tech & Gadgets',  slug: 'tech-gadgets',  icon: '💻' },
  { label: 'Textbooks',       slug: 'textbooks',     icon: '📚' },
  { label: 'Electronics',     slug: 'electronics',   icon: '📱' },
  { label: 'Fashion',         slug: 'fashion',       icon: '👗' },
  { label: 'Furniture',       slug: 'furniture',     icon: '🛋️' },
  { label: 'Services',        slug: 'services',      icon: '🛠️' },
];

const CONDITION_STYLES: Record<string, string> = {
  NEW:           'bg-green-100 text-green-700',
  SLIGHTLY_USED: 'bg-blue-100 text-blue-700',
  USED:          'bg-yellow-100 text-yellow-700',
  THRIFTED:      'bg-purple-100 text-purple-700',
};
const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New', SLIGHTLY_USED: 'S.Used', USED: 'Used', THRIFTED: 'Thrifted',
};

/* ─── Product card — matches reference layout ────────────────────────────── */
function ProductCard({
  product, inWishlist, inCart, cartLoading, onWishlist, onCart,
}: {
  product: Product;
  inWishlist: boolean;
  inCart: boolean;
  cartLoading: boolean;
  onWishlist: (e: React.MouseEvent) => void;
  onCart: (e: React.MouseEvent) => void;
}) {
  const navigate = useNavigate();
  const image = product.images.find(i => i.isPrimary)?.url || product.images[0]?.url;

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-pink-200 active:scale-[0.97] transition-all flex flex-col shadow-sm cursor-pointer"
    >
      {/* ── Square image ── */}
      <div className="relative aspect-square w-full overflow-hidden bg-pink-50">
        {image
          ? <img src={image} alt={product.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-pink-200" /></div>
        }

        {/* Condition badge — top left */}
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${CONDITION_STYLES[product.condition] || 'bg-gray-100 text-gray-500'}`}>
          {CONDITION_LABEL[product.condition] || product.condition}
        </span>

        {/* Wishlist — top right */}
        <button
          onClick={onWishlist}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
            inWishlist ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white/90 border-white text-gray-400 hover:border-pink-300 hover:text-pink-500'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Sold out overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full">Sold Out</span>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="p-2.5 flex flex-col flex-1">
        {/* Title */}
        <p className="text-xs sm:text-[13px] font-semibold text-gray-900 line-clamp-2 leading-snug mb-1.5">
          {product.title}
        </p>

        {/* Campus */}
        <div className="flex items-center gap-1 mb-1.5">
          <MapPin className="w-3 h-3 text-pink-400 flex-shrink-0" />
          <span className="text-[10px] text-gray-400 truncate">{product.campus}</span>
        </div>

        {/* Rating */}
        {product.rating != null && (
          <div className="flex items-center gap-1 mb-1.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] text-gray-500 font-medium">{product.rating}</span>
            <span className="text-[10px] text-gray-400">({product.reviewCount})</span>
          </div>
        )}

        {/* Price + cart */}
        <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
          <span className="font-black text-pink-500 text-sm leading-none">
            KSH {product.price.toLocaleString()}
          </span>
          <button
            onClick={onCart}
            disabled={product.stock === 0 || cartLoading || inCart}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 ${
              inCart
                ? 'bg-green-500 border-green-500 text-white'
                : cartLoading
                ? 'bg-pink-100 border-pink-200 text-pink-400'
                : 'bg-pink-50 border-pink-200 text-gray-500 hover:bg-pink-500 hover:border-pink-500 hover:text-white'
            } disabled:opacity-60`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="aspect-square bg-pink-100" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-pink-100 rounded w-4/5" />
        <div className="h-3 bg-pink-100 rounded w-3/5" />
        <div className="h-3 bg-pink-100 rounded w-2/5 mt-1" />
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function Marketplace() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [products,    setProducts]    = useState<Product[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);

  const [activeFilter, setActiveFilter] = useState('');
  const [nearby,       setNearby]       = useState(false);
  const [forYou,       setForYou]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [searchInput,  setSearchInput]  = useState('');
  const [sort,         setSort]         = useState('createdAt');
  const [showFilters,  setShowFilters]  = useState(false);

  const [forYouProducts, setForYouProducts] = useState<Product[]>([]);
  const [forYouLoading,  setForYouLoading]  = useState(false);

  const [wishlist,    setWishlist]    = useState<Set<string>>(new Set());
  const [cartItems,   setCartItems]   = useState<Set<string>>(new Set());
  const [cartLoading, setCartLoading] = useState<string | null>(null);

  const fetchProducts = useCallback(async (p = 1, reset = false) => {
    p === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '12', sort });
      if (activeFilter)           params.set('category', activeFilter);
      if (search)                 params.set('q', search);
      if (nearby && user?.campus) params.set('campus', user.campus);
      const res = await GET(`/api/products?${params}`);
      setProducts(prev => reset || p === 1 ? res.data.products : [...prev, ...res.data.products]);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [activeFilter, search, sort, nearby, user?.campus]);

  const fetchForYou = async () => {
    if (!user) return;
    setForYouLoading(true);
    try {
      const res = await GET('/api/products/recommended');
      setForYouProducts(res.data.products ?? res.data ?? []);
    } catch { setForYouProducts([]); }
    finally { setForYouLoading(false); }
  };

  useEffect(() => { if (!forYou) fetchProducts(1, true); }, [activeFilter, search, sort, nearby, forYou]);
  useEffect(() => { if (forYou) fetchForYou(); }, [forYou]);
  useEffect(() => {
    if (!user) return;
    GET('/api/buyer/wishlist').then(r => setWishlist(new Set(r.data.items.map((i: any) => i.productId)))).catch(() => {});
    GET('/api/buyer/cart').then(r => setCartItems(new Set(r.data.items.map((i: any) => i.productId)))).catch(() => {});
  }, [user]);
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  const clearAll = () => { setSearch(''); setSearchInput(''); setActiveFilter(''); setNearby(false); setForYou(false); };

  const activeCat       = CATEGORIES.find(c => c.slug === activeFilter);
  const displayProducts = forYou ? forYouProducts : products;
  const isLoading       = forYou ? forYouLoading : loading;
  const hasFilter       = !!(search || activeFilter || nearby || forYou);

  return (
    <div className="w-full overflow-x-hidden bg-white min-h-screen">

      {/* Flash Sale stories — has its own "More" button now */}
      <FlashSaleStories />

      {/* ── Search bar ───────────────────────────────────────────────────────
          Standalone, below the stories, above the filter pills.             */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search products…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full bg-pink-50 border border-pink-100 rounded-2xl py-2.5 pl-10 pr-9 text-sm focus:outline-none focus:border-pink-400 transition-colors"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────────
          Sticky below the 64px site header.                                 */}
      <div className="sticky top-16 z-20 bg-white border-b border-gray-100">

        {/* Controls row */}
        <div className="flex items-center gap-1.5 px-3 py-1.5">
          {/* Filter toggle on mobile */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`md:hidden flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              showFilters || activeFilter || nearby || forYou
                ? 'bg-pink-500 border-pink-500 text-white'
                : 'bg-pink-50 border-pink-200 text-gray-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>

          {/* Sort */}
          <div className="relative flex-shrink-0 ml-auto">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="appearance-none bg-pink-50 border border-pink-200 rounded-xl pl-2.5 pr-6 py-1.5 text-xs focus:outline-none focus:border-pink-500 text-gray-700 cursor-pointer"
            >
              <option value="createdAt">Latest</option>
              <option value="popular">Popular</option>
              <option value="price_asc">Low–Hi</option>
              <option value="price_desc">Hi–Low</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Filter pills — always visible on md+, toggled on mobile */}
        <div className={`${showFilters ? 'flex' : 'hidden'} md:flex items-center gap-1.5 overflow-x-auto px-3 pb-2 scrollbar-hide`}>
          {user && (
            <button
              onClick={() => { setForYou(true); setNearby(false); setActiveFilter(''); setShowFilters(false); }}
              className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                forYou ? 'bg-purple-500 border-purple-500 text-white' : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
            >
              <Sparkles className="w-3 h-3" /> For You
            </button>
          )}
          {user?.campus && (
            <button
              onClick={() => { setNearby(v => !v); setForYou(false); setShowFilters(false); }}
              className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                nearby ? 'bg-green-500 border-green-500 text-white' : 'bg-green-50 border-green-200 text-green-700'
              }`}
            >
              <MapPin className="w-3 h-3" /> Nearby
            </button>
          )}
          {CATEGORIES.map(cat => (
            <button
              key={cat.slug}
              onClick={() => { setActiveFilter(cat.slug); setNearby(false); setForYou(false); setShowFilters(false); }}
              className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all whitespace-nowrap ${
                !forYou && !nearby && activeFilter === cat.slug
                  ? 'bg-pink-500 border-pink-500 text-white'
                  : 'bg-pink-50 border-pink-200 text-gray-600'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results meta ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-3 gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold flex items-center gap-1.5 truncate">
            {forYou  ? <><Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />For You</>
             : nearby ? <><MapPin className="w-4 h-4 text-green-500 flex-shrink-0" /><span className="truncate">Nearby</span></>
             : activeFilter ? activeCat?.label
             : 'Explore'}
          </h2>
          <p className="text-[11px] text-gray-400">
            {isLoading ? 'Loading…'
              : forYou ? `${displayProducts.length} picks`
              : `${total} item${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        {hasFilter && (
          <button onClick={clearAll} className="flex-shrink-0 flex items-center gap-1 text-[11px] text-pink-500 border border-pink-200 px-2 py-1 rounded-lg font-medium">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Product grid ─────────────────────────────────────────────────── */}
      <div className="px-2 sm:px-3 pb-28 md:pb-10">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-10 h-10 text-pink-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600 text-sm">
              {forYou ? 'No recommendations yet' : nearby ? 'Nothing near your campus yet' : 'No products found'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {forYou ? 'Browse more to get personalised picks' : 'Try a different filter'}
            </p>
            <button onClick={clearAll} className="mt-4 bg-pink-500 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-pink-600 transition-colors">
              See All
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {displayProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                inWishlist={wishlist.has(product.id)}
                inCart={cartItems.has(product.id)}
                cartLoading={cartLoading === product.id}
                onWishlist={e => toggleWishlist(product.id, e)}
                onCart={e => addToCart(product.id, e)}
              />
            ))}
          </div>
        )}

        {!forYou && !isLoading && page < totalPages && (
          <button
            onClick={() => fetchProducts(page + 1)}
            disabled={loadingMore}
            className="mt-5 w-full py-3 rounded-xl bg-pink-50 border border-pink-200 text-sm font-semibold text-gray-700 hover:bg-pink-100 transition-colors disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : `Load More (${total - products.length} left)`}
          </button>
        )}
      </div>
    </div>
  );
}
