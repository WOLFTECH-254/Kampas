import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, MailCheck, RefreshCw } from 'lucide-react';

export default function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';

  const [digits, setDigits]         = useState(['', '', '', '', '', '']);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [resending, setResending]   = useState(false);
  const [resendMsg, setResendMsg]   = useState('');
  const [countdown, setCountdown]   = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
    else inputRefs.current[0]?.focus();
  }, [email, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError('');
    if (v && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every(d => d) && v) submitCode(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  };

  const submitCode = async (code: string) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.success) {
        navigate('/login?verified=true', { replace: true });
      } else {
        setError(data.message || 'Invalid or expired code.');
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) { setError('Enter all 6 digits.'); return; }
    submitCode(code);
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const res = await fetch('/api/auth/resend-verification-public', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setResendMsg('New code sent — check your inbox.');
        setCountdown(60);
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      } else {
        setResendMsg(data.message || 'Could not resend. Try again shortly.');
      }
    } catch {
      setResendMsg('Could not resend. Check your connection.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-pink-500/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src="/kampas-logo.jpg" alt="Kampas" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
          </Link>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 md:p-10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-pink-400" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              We sent a 6-digit code to<br />
              <span className="text-white font-semibold">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border bg-gray-800 text-white transition-all focus:outline-none
                    ${error ? 'border-red-500 bg-red-950/20' : d ? 'border-pink-500 bg-pink-950/20' : 'border-gray-700 focus:border-pink-500'}`}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center mb-4">{error}</p>
            )}

            {resendMsg && (
              <p className="text-green-400 text-sm text-center mb-4">{resendMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading || digits.some(d => !d)}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_24px_rgba(236,72,153,0.3)] hover:shadow-[0_0_32px_rgba(236,72,153,0.45)] flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify Email'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending…' : 'Resend code'}
            </button>
          </div>

          <p className="text-center text-gray-600 text-xs mt-4">
            Wrong email?{' '}
            <Link to="/signup" className="text-pink-500 hover:text-pink-400">
              Go back
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
