import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { GET } from '../lib/api';

interface Product {
  id: string;
  title: string;
  price: number;
  campus: string;
  images: { url: string; isPrimary: boolean }[];
  seller: { name: string };
}

const SALE_DISCOUNT = [20, 30, 40, 50];
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80',
  'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80',
  'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&q=80',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80',
];

function CountdownTimer({ endsAt }: { endsAt: Date }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = endsAt.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return <span className="font-mono text-xs font-bold tabular-nums">{timeLeft}</span>;
}

export default function FlashSaleStories() {
  const [products, setProducts]         = useState<Product[]>([]);
  const [open,     setOpen]             = useState(false);
  const [activeIdx, setActiveIdx]       = useState(0);
  const [progress, setProgress]         = useState(0);
  const [loading,  setLoading]          = useState(true);
  const progressRef                     = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION                        = 5000;
  const saleEnd                         = useRef(new Date(Date.now() + 3 * 3600000 + 47 * 60000));

  useEffect(() => {
    GET('/api/products?limit=8&sort=popular')
      .then(res => setProducts(res.data?.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    clearInterval(progressRef.current!);
    setProgress(0);
    const start = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressRef.current!);
        setActiveIdx(prev => {
          const next = prev + 1;
          if (next >= products.length) { setOpen(false); return 0; }
          return next;
        });
        setProgress(0);
      }
    }, 50);
    return () => clearInterval(progressRef.current!);
  }, [open, activeIdx, products.length]);

  if (loading || products.length === 0) return null;

  const product  = products[activeIdx];
  const image    = product?.images?.find(i => i.isPrimary)?.url || product?.images?.[0]?.url || FALLBACK_IMAGES[activeIdx % FALLBACK_IMAGES.length];
  const discount = SALE_DISCOUNT[activeIdx % SALE_DISCOUNT.length];
  const orig     = Math.round(product?.price * (1 + discount / 100));

  return (
    <>
      {/* Story bubbles row */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5 mb-3 min-w-0">
          <Zap className="w-4 h-4 text-pink-500 flex-shrink-0" />
          <span className="text-sm font-bold text-gray-900 flex-shrink-0">Flash Sales</span>
          <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
            ⏱ <CountdownTimer endsAt={saleEnd.current} />
          </span>
          <Link
            to="/flash-sales"
            className="ml-auto flex-shrink-0 text-[11px] font-bold text-pink-500 border border-pink-200 px-2 py-1 rounded-lg bg-pink-50 whitespace-nowrap"
          >
            More →
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {products.map((p, i) => {
            const img  = p.images?.find(img => img.isPrimary)?.url || p.images?.[0]?.url || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
            const disc = SALE_DISCOUNT[i % SALE_DISCOUNT.length];
            return (
              <button
                key={p.id}
                onClick={() => { setActiveIdx(i); setOpen(true); }}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
              >
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-pink-500 shadow-sm group-hover:border-pink-600 transition-all">
                  <img src={img} alt={p.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute bottom-1 left-1 text-[9px] font-bold text-white bg-pink-500 px-1 rounded">-{disc}%</span>
                </div>
                <span className="text-[10px] text-gray-600 font-medium w-16 text-center truncate">{p.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full-screen story modal */}
      {open && product && (
        <div className="fixed inset-0 z-[999] bg-black flex flex-col">
          {/* Progress bars */}
          <div className="flex gap-1 px-3 pt-safe pt-4 absolute top-0 left-0 right-0 z-10">
            {products.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{ width: i < activeIdx ? '100%' : i === activeIdx ? `${progress}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-10 pb-2 absolute top-0 left-0 right-0 z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-xs font-bold">Flash Sale</p>
                <p className="text-white/60 text-[10px]">by {product.seller?.name}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 relative">
            <img src={image} alt={product.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />

            {/* Nav tap zones */}
            <button className="absolute left-0 top-0 bottom-0 w-1/3" onClick={() => {
              setActiveIdx(prev => Math.max(0, prev - 1)); setProgress(0);
            }} />
            <button className="absolute right-0 top-0 bottom-0 w-1/3" onClick={() => {
              const next = activeIdx + 1;
              if (next >= products.length) setOpen(false);
              else { setActiveIdx(next); setProgress(0); }
            }} />
          </div>

          {/* Product info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe">
            <p className="text-white/60 text-xs mb-1">{product.campus}</p>
            <h3 className="text-white text-xl font-bold mb-2 leading-tight">{product.title}</h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-pink-400 text-2xl font-black">KSH {product.price.toLocaleString()}</span>
              <span className="text-white/50 line-through text-sm">KSH {orig.toLocaleString()}</span>
              <span className="bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-white/20 backdrop-blur-sm text-white font-bold py-3 rounded-xl border border-white/30 hover:bg-white/30 transition-colors"
              >
                Continue Browsing
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors"
              >
                View Item
              </button>
            </div>
          </div>

          {/* Prev/Next arrows for desktop */}
          <button onClick={() => { setActiveIdx(prev => Math.max(0, prev - 1)); setProgress(0); }}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 items-center justify-center hover:bg-white/40">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => { const n = activeIdx + 1; if (n >= products.length) setOpen(false); else { setActiveIdx(n); setProgress(0); } }}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 items-center justify-center hover:bg-white/40">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </>
  );
}
