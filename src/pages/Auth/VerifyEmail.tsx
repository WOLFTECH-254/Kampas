import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please check your email link.');
      return;
    }

    api(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { method: 'GET' })
      .then(res => {
        setStatus('success');
        setMessage(res.message || 'Your email has been verified.');
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-pink-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-pink-700/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src="/kampas-logo.jpg" alt="Kampas" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
          </Link>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 md:p-10 text-center shadow-2xl">

          {status === 'loading' && (
            <div className="py-4">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                  <Loader2 className="w-9 h-9 text-pink-400 animate-spin" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Verifying your email…</h1>
              <p className="text-gray-500 text-sm">Just a moment, this won't take long.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path className="checkmark-path" d="M5 13l4 4L19 7"
                      style={{
                        strokeDasharray: 30,
                        strokeDashoffset: 0,
                        animation: 'drawCheck 0.4s ease-out 0.1s both',
                      }}
                    />
                  </svg>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Verification successful
              </div>

              <h1 className="text-2xl font-bold text-white mb-3">Email Confirmed!</h1>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Your Kampas account is now active. You can log in and start exploring the marketplace.
              </p>

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_0_24px_rgba(236,72,153,0.3)] hover:shadow-[0_0_32px_rgba(236,72,153,0.45)] active:scale-[0.98]"
              >
                Continue to Login
              </Link>

              <p className="text-gray-600 text-xs mt-5">
                Welcome to Kampas — Kenya's student marketplace
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                Verification failed
              </div>

              <h1 className="text-2xl font-bold text-white mb-3">Link Expired</h1>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">{message}</p>

              <Link
                to="/signup"
                className="flex items-center justify-center gap-2 w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_0_24px_rgba(236,72,153,0.3)] hover:shadow-[0_0_32px_rgba(236,72,153,0.45)] active:scale-[0.98] mb-3"
              >
                Create a New Account
              </Link>

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3.5 px-8 rounded-xl transition-all"
              >
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes drawCheck {
          from { stroke-dashoffset: 30; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
