import { motion } from 'framer-motion';
import { ArrowRight, Star, MapPin, Zap, Clock, ShieldCheck, Ticket, Calendar, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const categories = [
  { name: 'Sneakers & Drip', icon: '👟', count: 'Shop Now' },
  { name: 'Hostels & Bedsitters', icon: '🏠', count: 'Find Rooms' },
  { name: 'Campus Events', icon: '🎟️', count: 'Get Tickets' },
  { name: 'Tech & Gadgets', icon: '💻', count: 'Explore' },
  { name: 'Gigs & Hustles', icon: '💸', count: 'Browse' },
  { name: 'Beauty & Salon', icon: '💅', count: 'Discover' },
];

const trendingProducts = [
  { id: 1, name: 'Air Jordan 4 Retro', price: 'KSH 4,500', campus: 'UoN Main Campus', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', condition: 'New' },
  { id: 2, name: 'MacBook Pro M1 (Used)', price: 'KSH 95,000', campus: 'Strathmore', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80', condition: 'Slightly Used' },
  { id: 3, name: 'PS5 Controller', price: 'KSH 6,000', campus: 'KU', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80', condition: 'New' },
  { id: 4, name: 'Vintage Denim Jacket', price: 'KSH 1,200', campus: 'JKUAT', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&q=80', condition: 'Thrifted' },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden w-full bg-white text-gray-900 min-h-screen">
      {/* Landing Navigation Header */}
      <header className="absolute top-0 w-full z-50 border-b border-pink-200/50 bg-white/50 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/kampas-logo.jpg" alt="Kampas" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
            <span className="font-bold text-xl tracking-tight hidden sm:block">Kampas</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="flex items-center gap-2 text-sm font-semibold hover:text-pink-600 transition-colors">
              <LogIn className="w-4 h-4" /> Log In
            </Link>
            <Link to="/signup" className="flex items-center gap-2 bg-pink-500 text-gray-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-pink-600 transition-colors">
              <UserPlus className="w-4 h-4" /> Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-pink-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-pink-200 bg-pink-50/50 backdrop-blur-md mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-plug-lime animate-pulse"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">Kenya's #1 Campus Marketplace</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Your Everyday <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-pink-600">Kampas.</span>
          <br/>Everything Student.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10"
        >
          Buy, sell, find student housing, and catch campus events — all in one place built for Kenyan university, KMTC, and TVET students.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
        >
          <Link to="/signup" className="flex-1 bg-pink-500 text-gray-900 font-bold py-4 px-8 rounded-xl hover:bg-pink-600 transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] flex items-center justify-center gap-2">
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/login" className="flex-1 bg-pink-50 border border-pink-200 text-gray-900 font-bold py-4 px-8 rounded-xl hover:bg-pink-200 transition-colors flex items-center justify-center gap-2">
            Log In
          </Link>
        </motion.div>
      </section>

      {/* Categories */}
      <section className="px-4 md:px-8 max-w-7xl mx-auto py-12">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">Explore <Zap className="text-pink-600 w-6 h-6" /></h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5, borderColor: 'var(--color-plug-yellow)' }}
              className="bg-pink-50/50 border border-pink-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all"
            >
              <div className="text-4xl group-hover:scale-110 transition-transform">{category.icon}</div>
              <h3 className="font-semibold text-sm text-center">{category.name}</h3>
              <p className="text-xs text-gray-500">{category.count}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trending / Marketplace Preview */}
      <section className="px-4 md:px-8 max-w-7xl mx-auto py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">Trending on Campus 🔥</h2>
          <Link to="/explore" className="text-sm font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {trendingProducts.map((product) => (
            <div key={product.id} className="bg-pink-50 rounded-2xl overflow-hidden border border-pink-200 hover:border-pink-500/50 transition-colors group">
              <div className="relative aspect-square overflow-hidden bg-white">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-2 right-2 bg-white/60 backdrop-blur-md px-2 py-1 rounded text-xs font-semibold border border-pink-200">
                  {product.condition}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate mb-1">{product.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                  <MapPin className="w-3 h-3" /> {product.campus}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-pink-600">{product.price}</span>
                  <button className="w-8 h-8 rounded-full bg-plug-gray flex items-center justify-center hover:bg-pink-500 hover:text-gray-900 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Banner / CTA */}
      <section className="px-4 md:px-8 max-w-7xl mx-auto py-12">
        <div className="bg-gradient-to-r from-pink-50 to-white border border-pink-200 rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 rounded-full blur-[80px]"></div>
          
          <div className="relative z-10 max-w-lg">
            <h2 className="text-3xl font-bold mb-4">Open Your Campus Store in Minutes.</h2>
            <p className="text-gray-600 mb-6">Launch your Kampas storefront for free. Accept Mpesa via Paystack, manage orders, and sell to thousands of students on your campus.</p>
            <div className="flex items-center gap-4 text-sm font-semibold mb-8">
              <div className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-plug-lime" /> Verified Profiles</div>
              <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-plug-lime" /> Instant Payouts</div>
            </div>
            <Link to="/signup" className="inline-block bg-gray-900 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-700 transition-colors">
              Open Store Free
            </Link>
          </div>

          <div className="relative w-full md:w-1/2 flex justify-center z-10">
            {/* Abstract decorative cards */}
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="bg-white border shadow-2xl shadow-black/50 border-pink-200 p-4 rounded-2xl w-64 rotate-[-6deg]"
            >
              <div className="w-full h-32 bg-pink-50 rounded-lg mb-3 flex items-center justify-center">
                 <img src="https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=200&q=80" className="w-full h-full object-cover rounded-lg opacity-80" />
              </div>
              <div className="h-4 w-3/4 bg-plug-gray rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-plug-gray rounded"></div>
              <div className="mt-4 flex justify-between items-center text-xs text-pink-600 font-bold">
                 KSH 2,500 <span className="bg-plug-lime/20 text-plug-lime px-2 py-0.5 rounded">Sold</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-pink-200 mt-20 px-8 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/kampas-logo.jpg" alt="Kampas" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-gray-800">Kampas</span>
            <span className="text-gray-400 text-sm ml-2">Kenya's #1 campus marketplace</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link to="/terms"   className="hover:text-pink-600 transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-pink-600 transition-colors">Privacy Policy</Link>
            <Link to="/docs"    className="hover:text-pink-600 transition-colors">Help Centre</Link>
            <a href="mailto:support@kampas.co.ke" className="hover:text-pink-600 transition-colors">Contact Us</a>
          </div>
          <p className="text-xs text-gray-400">&copy; 2026 Kampas. Made in Nairobi.</p>
        </div>
      </footer>
    </div>
  );
}
