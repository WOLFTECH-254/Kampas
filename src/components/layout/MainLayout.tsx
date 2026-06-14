
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Compass, ShoppingBag, Calendar, MessageCircle, User, Search, ShoppingCart, Menu, X, LogOut, Map, Home, Wallet, Zap } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';
import Footer from '../Footer';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSeller = user?.role === 'SELLER';
  const isBuyer  = user?.role === 'BUYER';

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: isSeller ? '/dashboard/seller' : '/dashboard/buyer', show: true },
    { icon: Compass,         label: 'Explore',      path: '/explore',      show: true },
    { icon: Zap,             label: 'Flash Sales',  path: '/flash-sales',  show: true },
    { icon: Map,             label: 'Map',          path: '/map',          show: true },
    { icon: Home,            label: 'Housing',    path: '/housing',          show: true },
    { icon: ShoppingBag,     label: 'Sell',       path: '/dashboard/seller', show: isSeller },
    { icon: Wallet,          label: 'Wallet',     path: '/wallet',           show: isBuyer },
    { icon: Calendar,        label: 'Events',     path: '/events',           show: true },
    { icon: MessageCircle,   label: 'Chats',      path: '/chats',            show: true },
    { icon: User,            label: 'Profile',    path: '/profile',          show: true },
  ].filter(i => i.show);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-gray-900 font-sans pb-20 md:pb-0 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-pink-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">

          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/explore" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center font-bold text-white text-xl">K</div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">Kampas</span>
            </Link>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search campus, gigs, items..."
                className="w-full bg-pink-50 border border-pink-200 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden lg:block text-sm font-medium text-gray-700 mr-1">
              {user?.name?.split(' ')[0]}
            </span>
            {isBuyer && (
              <span className="hidden lg:block text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
                KSH {(user?.walletBalance ?? 0).toLocaleString()}
              </span>
            )}

            <NotificationBell />

            {isBuyer && (
              <button onClick={() => navigate('/dashboard/buyer?tab=cart')}
                className="relative p-2 text-gray-600 hover:text-gray-900 bg-pink-50 rounded-xl border border-pink-200 hover:border-pink-400 transition-colors">
                <ShoppingCart className="w-5 h-5" />
              </button>
            )}

            <Link to="/profile"
              className="hidden md:block w-9 h-9 rounded-full overflow-hidden border-2 border-pink-200 hover:border-pink-500 transition-colors flex-shrink-0">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'user'}`}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-w-0 overflow-x-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 fixed left-0 top-16 bottom-0 border-r border-pink-200 bg-white/50 p-4 gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.label} to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm',
                  isActive ? 'bg-pink-500/10 text-pink-600' : 'text-gray-600 hover:text-gray-900 hover:bg-pink-50'
                )}>
                <item.icon className={cn('w-5 h-5', isActive && 'text-pink-600')} />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-auto pt-4 border-t border-pink-200 space-y-3">
            <div className="px-4">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${isSeller ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                {user?.role}
              </span>
            </div>
            {user && (
              <div className="p-3 rounded-xl bg-pink-50 border border-pink-200 flex items-center gap-3">
                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                  className="w-9 h-9 rounded-full border border-pink-200 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.campus || user.email}</p>
                </div>
                <button onClick={handleLogout} title="Logout"
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
            {isBuyer && user && !user.isVerified && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-white border border-pink-200">
                <h4 className="font-bold text-sm mb-1">Verify your account</h4>
                <p className="text-xs text-gray-500 mb-3">Required to place orders & chat.</p>
                <Link to="/profile?tab=verify"
                  className="block w-full py-2 bg-pink-500 text-white text-xs font-bold rounded-lg hover:bg-pink-600 transition-colors text-center">
                  Get Verified
                </Link>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0 w-full overflow-x-hidden md:ml-64 min-h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-6 shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-lg">Menu</span>
              <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            {user && (
              <Link to="/profile" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 mb-6 p-3 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors">
                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-semibold text-sm">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.campus}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSeller ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                    {user.role}
                  </span>
                </div>
              </Link>
            )}
            {navItems.map(item => (
              <Link key={item.label} to={item.path} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors">
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 w-full mt-4">
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-pink-200 px-2 py-3 flex justify-around items-center z-50">
        {navItems.slice(0, 6).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.label} to={item.path} className="flex flex-col items-center gap-0.5">
              <item.icon className={cn('w-5 h-5', isActive ? 'text-pink-600' : 'text-gray-400')} />
              <span className={`text-[9px] font-medium ${isActive ? 'text-pink-600' : 'text-gray-400'}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
