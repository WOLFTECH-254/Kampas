import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import MainLayout from './components/layout/MainLayout';
import LandingPage from './pages/LandingPage';
import Marketplace from './pages/Marketplace';
import SellerDashboard from './pages/SellerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Events from './pages/Events';
import Chats from './pages/Chats';
import Profile from './pages/Profile';
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import VerifyEmail from './pages/Auth/VerifyEmail';
import VerifyOTP from './pages/Auth/VerifyOTP';
import Onboarding from './pages/Auth/Onboarding';
import CampusMap from './pages/CampusMap';
import Housing from './pages/Housing';
import WalletPage from './pages/WalletPage';
import ProductDetail from './pages/ProductDetail';
import Terms from './pages/legal/Terms';
import Privacy from './pages/legal/Privacy';
import Docs from './pages/legal/Docs';
import FlashSales from './pages/FlashSales';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN')                          return <Navigate to="/admin" replace />;
  if (!user.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  if (user.role === 'SELLER' || user.role === 'BOTH') return <Navigate to="/dashboard/seller" replace />;
  return <Navigate to="/explore" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"            element={<LandingPage />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/signup"          element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/verify-email"    element={<VerifyEmail />} />
            <Route path="/verify-otp"      element={<VerifyOTP />} />
            <Route path="/home"        element={<HomeRedirect />} />

            {/* Onboarding — protected, no layout */}
            <Route path="/onboarding" element={
              <ProtectedRoute><Onboarding /></ProtectedRoute>
            } />

            {/* Legal — public */}
            <Route path="/terms"   element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/docs"    element={<Docs />} />

            {/* Product detail — public */}
            <Route path="/product/:id" element={<ProductDetail />} />

            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/explore"     element={<Marketplace />} />
              <Route path="/flash-sales" element={<FlashSales />} />
              <Route path="/events"   element={<Events />} />
              <Route path="/chats"    element={<Chats />} />
              <Route path="/profile"  element={<Profile />} />
              <Route path="/map"      element={<CampusMap />} />
              <Route path="/housing"  element={<Housing />} />
              <Route path="/dashboard/buyer" element={
                <RoleRoute allowedRoles={['BUYER', 'BOTH']} redirectTo="/dashboard/seller">
                  <BuyerDashboard />
                </RoleRoute>
              } />
              <Route path="/wallet" element={
                <RoleRoute allowedRoles={['BUYER', 'BOTH']} redirectTo="/explore">
                  <WalletPage />
                </RoleRoute>
              } />
              <Route path="/dashboard/seller" element={
                <RoleRoute allowedRoles={['SELLER', 'BOTH']} redirectTo="/dashboard/buyer">
                  <SellerDashboard />
                </RoleRoute>
              } />
            </Route>

            <Route path="/admin/*" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['ADMIN']} redirectTo="/explore">
                  <AdminDashboard />
                </RoleRoute>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/explore" replace />} />
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}
