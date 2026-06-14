
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, MailCheck, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  const verifiedParam  = searchParams.get('verified');
  const verifyError    = searchParams.get('verifyError');

  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [unverified,      setUnverified]      = useState(false);
  const [resendLoading,   setResendLoading]   = useState(false);
  const [resendSuccess,   setResendSuccess]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setLoading(true);

    try {
      const { redirectTo } = await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true);
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      // Log in temporarily to get a token for the resend endpoint
      const res = await fetch('/api/auth/resend-verification-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendSuccess(true);
    } catch {
      // Silently fail — tell user to check spam
      setResendSuccess(true);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-pink-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-pink-50 border border-pink-200 rounded-3xl p-8 relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/kampas-logo.jpg" alt="Kampas" className="w-12 h-12 rounded-xl object-cover shadow-md" />
          </Link>
          <h1 className="text-2xl font-bold mb-2">Welcome Back to Kampas</h1>
          <p className="text-gray-600 text-sm">Enter your details to access your dashboard.</p>
        </div>

        {/* Email verified success banner */}
        {(verifiedParam === 'true' || verifiedParam === 'already') && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 mb-0.5">Email verified!</p>
                <p className="text-green-700">Your account is active. Log in below to get started.</p>
              </div>
            </div>
          </div>
        )}

        {/* Verify link expired banner */}
        {verifyError === 'expired' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 mb-0.5">Verification link expired</p>
                <p className="text-red-700">Enter your email and password to log in, then request a new link.</p>
              </div>
            </div>
          </div>
        )}

        {/* Unverified email banner */}
        {unverified && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <div className="flex items-start gap-3">
              <MailCheck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 mb-1">Email not verified</p>
                <p className="text-amber-700 mb-2">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
                <Link
                  to={`/verify-otp?email=${encodeURIComponent(email)}`}
                  className="inline-block bg-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Enter verification code
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Generic error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.ac.ke"
                required
                className="w-full bg-white border border-pink-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
              <Link to="/forgot-password" className="text-xs text-pink-600 hover:text-pink-700 font-medium">Forgot Password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white border border-pink-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 text-white font-bold py-3 mt-4 rounded-xl hover:bg-pink-600 transition-all shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)] flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : (<>Log In to Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>)}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          Don't have an account? <Link to="/signup" className="text-pink-600 hover:text-pink-700 font-semibold ml-1">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
