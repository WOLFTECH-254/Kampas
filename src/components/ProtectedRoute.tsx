
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img src="/kampas-logo.jpg" alt="Kampas" className="w-16 h-16 rounded-2xl object-cover shadow-lg animate-pulse" />
            <span className="absolute inset-0 rounded-2xl ring-4 ring-pink-400/40 animate-ping" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-40 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full animate-loading-bar" />
            </div>
            <p className="text-gray-400 text-xs font-medium mt-1">Loading Kampas…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
