import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const userId = searchParams.get('userId') || '';
  const code   = searchParams.get('code')   || '';

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [error,           setError]           = useState('');

  // Validate link params on mount
  const invalidLink = !userId || !code || code.length !== 6;

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => navigate('/login'), 3000);
      return () => clearTimeout(t);
    }
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6)           { setError('Password must be at least 6 characters.');  return; }
    if (newPassword !== confirmPassword)  { setError('Passwords do not match.');                   return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, code, newPassword }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
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

          {/* ── Invalid link ───────────────────────────────────────────── */}
          {invalidLink && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Invalid or expired link</h2>
                <p className="text-gray-500 text-sm mt-2">
                  This password reset link is missing information or has already been used. Please request a new one.
                </p>
              </div>
              <Link
                to="/forgot-password"
                className="inline-block w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors text-center text-sm"
              >
                Request new reset link
              </Link>
              <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </div>
          )}

          {/* ── Success ────────────────────────────────────────────────── */}
          {!invalidLink && success && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Password reset!</h2>
                <p className="text-gray-500 text-sm mt-2">
                  Your password has been updated. Redirecting you to login…
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors text-center text-sm"
              >
                Go to login now →
              </Link>
            </div>
          )}

          {/* ── Form ───────────────────────────────────────────────────── */}
          {!invalidLink && !success && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Set new password</h2>
                <p className="text-gray-500 text-sm mt-1">Choose a strong password for your Kampas account.</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      className="w-full pl-9 pr-10 py-3 bg-pink-50 border border-pink-200 rounded-xl text-sm focus:outline-none focus:border-pink-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      className="w-full pl-9 pr-10 py-3 bg-pink-50 border border-pink-200 rounded-xl text-sm focus:outline-none focus:border-pink-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Live match indicator */}
                  {confirmPassword && (
                    <p className={`text-xs mt-1 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                      {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                >
                  {loading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Resetting…</>
                    : <><CheckCircle className="w-4 h-4" /> Reset password</>
                  }
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
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
