import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, RefreshCw, Send } from 'lucide-react';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-pink-500 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-black text-2xl">K</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Kampas</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-8">

          {sent ? (
            /* ── Success state ─────────────────────────────────────────── */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
                <p className="text-gray-500 text-sm mt-2">
                  We've sent a password reset link to <strong className="text-gray-700">{email}</strong>.
                  Click the link in the email to set a new password.
                </p>
              </div>
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-sm text-left text-gray-600 space-y-1">
                <p>• Check your spam / junk folder if you don't see it</p>
                <p>• The link expires in <strong>10 minutes</strong></p>
              </div>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-sm text-pink-600 hover:text-pink-700 font-medium underline underline-offset-2"
              >
                Send to a different email
              </button>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form ──────────────────────────────────────────────────── */
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Forgot password?</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="student@university.ac.ke"
                      required
                      className="w-full pl-9 pr-4 py-3 bg-pink-50 border border-pink-200 rounded-xl text-sm focus:outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                    : <><Send className="w-4 h-4" /> Send reset link</>
                  }
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
