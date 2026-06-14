import { Link } from 'react-router-dom';
import { MapPin, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const year = new Date().getFullYear();
  const { user } = useAuth();
  const role = user?.role;

  return (
    <footer className="bg-gray-50 border-t border-pink-100 mt-12 pb-24 md:pb-0">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center font-bold text-white text-xl">K</div>
              <span className="font-bold text-xl">Kampas</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Kenya's #1 campus marketplace — buy, sell, find housing & catch events near you.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-gray-900 mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link to="/explore" className="hover:text-pink-500 transition-colors">Marketplace</Link></li>
              <li><Link to="/map"     className="hover:text-pink-500 transition-colors">Campus Map</Link></li>
              <li><Link to="/events"  className="hover:text-pink-500 transition-colors">Events</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm text-gray-900 mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              {role === 'SELLER' || role === 'BOTH' ? (
                <li><Link to="/dashboard/seller" className="hover:text-pink-500 transition-colors">Seller Dashboard</Link></li>
              ) : null}
              {role === 'BUYER' || role === 'BOTH' || !role ? (
                <li><Link to="/dashboard/buyer" className="hover:text-pink-500 transition-colors">Buyer Dashboard</Link></li>
              ) : null}
              <li><Link to="/profile" className="hover:text-pink-500 transition-colors">My Profile</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm text-gray-900 mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-pink-400" />support@kampas.co.ke</li>
              <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-pink-400" />Nairobi, Kenya</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-pink-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© {year} Kampas. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link to="/privacy" className="hover:text-pink-500 transition-colors">Privacy Policy</Link>
            <Link to="/terms"   className="hover:text-pink-500 transition-colors">Terms of Service</Link>
            <Link to="/docs"    className="hover:text-pink-500 transition-colors">Help Centre</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
