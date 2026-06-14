import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, User, Phone, MapPin, AlertCircle, Search, ChevronDown, Gift } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { KENYA_CAMPUSES, TYPE_EMOJI } from '../../lib/campuses';

export default function SignUp() {
  const navigate   = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', campus: '', password: '',
    referralCode: '',
  });
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [campusSearch, setCampusSearch] = useState('');
  const [campusOpen,   setCampusOpen]   = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const campusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (campusRef.current && !campusRef.current.contains(e.target as Node)) {
        setCampusOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = KENYA_CAMPUSES.filter(c =>
    c.name.toLowerCase().includes(campusSearch.toLowerCase()) ||
    c.county.toLowerCase().includes(campusSearch.toLowerCase()) ||
    c.type.toLowerCase().includes(campusSearch.toLowerCase())
  ).slice(0, 40);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(formData);
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-4 relative overflow-hidden py-12">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-pink-50 border border-pink-200 rounded-3xl p-8 md:p-10 relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/kampas-logo.jpg" alt="Kampas" className="w-12 h-12 rounded-xl object-cover shadow-md" />
          </Link>
          <h1 className="text-2xl font-bold mb-2">Create Your Kampas Profile</h1>
          <p className="text-gray-600 text-sm">Join the ultimate student ecosystem today.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Briton Odhiambo" required
                  className="w-full bg-white border border-pink-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-600" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="07XX XXX XXX" required
                  className="w-full bg-white border border-pink-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-600" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@university.ac.ke" required
                className="w-full bg-white border border-pink-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-600" />
            </div>
          </div>

          <div ref={campusRef}>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Campus / Institution</label>
            <div className="relative">
              <button type="button" onClick={() => { setCampusOpen(o => !o); setCampusSearch(''); }}
                className={`w-full bg-white border rounded-xl py-3 pl-10 pr-10 text-sm text-left transition-colors focus:outline-none ${campusOpen ? 'border-pink-500' : 'border-pink-200 hover:border-pink-400'} ${formData.campus ? 'text-gray-900' : 'text-gray-400'}`}>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <span className="truncate block">{formData.campus || 'Select your campus or institution...'}</span>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${campusOpen ? 'rotate-180' : ''}`} />
              </button>

              {campusOpen && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-pink-200 rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-pink-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input autoFocus type="text" value={campusSearch}
                        onChange={e => setCampusSearch(e.target.value)}
                        placeholder="Search university, TVET, KMTC, county..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-pink-50 rounded-lg border border-pink-100 focus:outline-none focus:border-pink-400"
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No results for "{campusSearch}"</p>
                    ) : filtered.map(c => (
                      <button key={c.name} type="button"
                        onClick={() => { setFormData({ ...formData, campus: c.name }); setCampusOpen(false); setCampusSearch(''); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-pink-50 transition-colors flex items-center gap-2 ${formData.campus === c.name ? 'bg-pink-50 text-pink-600 font-semibold' : 'text-gray-700'}`}>
                        <span className="text-base flex-shrink-0">{TYPE_EMOJI[c.type]}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.type} · {c.county}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <input type="text" required value={formData.campus} onChange={() => {}}
              className="sr-only" tabIndex={-1} aria-hidden="true" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••" required minLength={6}
                className="w-full bg-white border border-pink-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-600" />
            </div>
          </div>

          <div>
            <button type="button" onClick={() => setShowReferral(r => !r)}
              className="flex items-center gap-1.5 text-xs text-pink-600 font-semibold hover:text-pink-700 transition-colors">
              <Gift className="w-3.5 h-3.5" />
              {showReferral ? 'Hide referral code' : 'Have a referral code? (optional)'}
            </button>
            {showReferral && (
              <div className="mt-2 relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-400" />
                <input type="text" value={formData.referralCode}
                  onChange={e => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. KMP-X7K9"
                  maxLength={20}
                  className="w-full bg-white border border-pink-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-400 font-mono tracking-wide" />
              </div>
            )}
          </div>

          <button type="submit" disabled={loading || !formData.campus}
            className="w-full bg-pink-500 text-white font-bold py-3 mt-2 rounded-xl hover:bg-pink-600 transition-all shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)] flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Creating profile...' : (<>Create Profile <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>)}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-pink-600 hover:text-pink-700 font-semibold ml-1">Log In</Link>
        </div>
      </div>
    </div>
  );
}
