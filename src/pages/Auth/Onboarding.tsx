import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Store, Layers, ArrowRight, AlertCircle,
  ChevronRight, Check, SkipForward,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

type RoleChoice = 'BUYER' | 'SELLER' | 'BOTH';
type Step       = 'role' | 'survey';

const ROLE_OPTIONS: { role: RoleChoice; icon: React.ReactNode; label: string; sub: string; perks: string[] }[] = [
  {
    role:  'BUYER',
    icon:  <ShoppingBag className="w-7 h-7" />,
    label: 'Buyer',
    sub:   'I want to shop & discover',
    perks: ['Browse thousands of campus products', 'Buy from verified student sellers', 'Find housing & event tickets'],
  },
  {
    role:  'SELLER',
    icon:  <Store className="w-7 h-7" />,
    label: 'Seller',
    sub:   'I want to sell & earn',
    perks: ['Open your own campus store', 'Reach thousands of students', 'Track orders & payouts'],
  },
  {
    role:  'BOTH',
    icon:  <Layers className="w-7 h-7" />,
    label: 'Both',
    sub:   'I want to buy & sell',
    perks: ['Full buyer access', 'Full seller dashboard', 'Switch between experiences seamlessly'],
  },
];

const CATEGORIES = [
  { slug: 'electronics',   label: 'Electronics',       emoji: '📱' },
  { slug: 'food-drinks',   label: 'Food & Drinks',      emoji: '🍔' },
  { slug: 'fashion',       label: 'Fashion & Clothing', emoji: '👕' },
  { slug: 'books-notes',   label: 'Books & Notes',      emoji: '📚' },
  { slug: 'beauty-health', label: 'Beauty & Health',    emoji: '💄' },
  { slug: 'sports',        label: 'Sports & Fitness',   emoji: '⚽' },
  { slug: 'services',      label: 'Services',           emoji: '🔧' },
  { slug: 'events',        label: 'Events & Tickets',   emoji: '🎉' },
];

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Occasionally'];

const BUDGETS = [
  { label: 'Under KSH 500',       value: 'LOW' },
  { label: 'KSH 500 – 2,000',     value: 'MEDIUM' },
  { label: 'KSH 2,000 – 5,000',   value: 'HIGH' },
  { label: 'Over KSH 5,000',      value: 'VERY_HIGH' },
];

export default function Onboarding() {
  const navigate              = useNavigate();
  const { token, refresh }    = useAuth();
  const [step, setStep]       = useState<Step>('role');
  const [selected, setSelected]         = useState<RoleChoice | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const [selCats, setSelCats]           = useState<string[]>([]);
  const [shopFrequency, setShopFrequency] = useState('');
  const [budgetRange, setBudgetRange]   = useState('');

  const toggleCat = (slug: string) =>
    setSelCats(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);

  const handleRoleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await api('/api/auth/onboarding', {
        method: 'POST',
        body:   { role: selected },
        auth:   true,
      });
      const newToken = res.data?.token;
      if (newToken) localStorage.setItem('kampas_token', newToken);
      await refresh();

      if (selected === 'SELLER') {
        navigate('/dashboard/seller', { replace: true });
      } else {
        setStep('survey');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitSurvey = async (skip = false) => {
    setLoading(true);
    try {
      if (!skip) {
        await api('/api/auth/survey', {
          method: 'POST',
          body: {
            interestedCats: selCats.length ? selCats : undefined,
            budgetRange:    budgetRange || undefined,
            shopFrequency:  shopFrequency || undefined,
          },
          auth: true,
        });
      }
    } catch {
    } finally {
      setLoading(false);
      if (selected === 'BOTH') {
        navigate('/dashboard/seller', { replace: true });
      } else {
        navigate('/explore', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-300/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-8">
          <img src="/kampas-logo.jpg" alt="Kampas" className="w-14 h-14 rounded-xl object-cover shadow-md mx-auto mb-4" />
          {step === 'role' ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">How will you use Kampas?</h1>
              <p className="text-gray-500">Choose how you'd like to get started. You can always change this later.</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <div className="w-2 h-2 rounded-full bg-pink-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Personalise your feed</h1>
              <p className="text-gray-500">Help us show you products you'll actually love. Takes 30 seconds.</p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {step === 'role' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {ROLE_OPTIONS.map(opt => {
                const isSelected = selected === opt.role;
                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => setSelected(opt.role)}
                    className={`rounded-2xl border-2 p-6 text-left transition-all duration-200 focus:outline-none ${
                      isSelected
                        ? 'border-pink-500 bg-pink-50 shadow-[0_0_0_4px_rgba(236,72,153,0.12)]'
                        : 'border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                      isSelected ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-500'
                    }`}>
                      {opt.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{opt.label}</h3>
                    <p className="text-gray-500 text-sm mb-4">{opt.sub}</p>
                    <ul className="space-y-1.5">
                      {opt.perks.map(p => (
                        <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-pink-400 mt-0.5 flex-shrink-0">✓</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                    {isSelected && (
                      <div className="mt-4 flex items-center gap-1.5 text-pink-600 font-semibold text-sm">
                        <div className="w-2 h-2 rounded-full bg-pink-500" />
                        Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleRoleContinue}
              disabled={!selected || loading}
              className="w-full bg-pink-500 text-white font-bold py-4 rounded-xl hover:bg-pink-600 transition-all shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Setting up your account…' : (
                <>
                  Continue to Kampas
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </>
        )}

        {step === 'survey' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">
                What will you mostly shop for?
                <span className="ml-2 text-xs font-normal text-gray-400">pick all that apply</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORIES.map(cat => {
                  const active = selCats.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => toggleCat(cat.slug)}
                      className={`relative rounded-xl border-2 px-3 py-3 text-left transition-all text-sm font-medium flex items-center gap-2 ${
                        active
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-pink-300'
                      }`}
                    >
                      <span className="text-lg leading-none">{cat.emoji}</span>
                      <span className="flex-1 leading-tight">{cat.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">How often do you shop on campus marketplaces?</h2>
              <div className="flex flex-wrap gap-3">
                {FREQUENCIES.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setShopFrequency(prev => prev === f ? '' : f)}
                    className={`px-5 py-2.5 rounded-full border-2 text-sm font-medium transition-all ${
                      shopFrequency === f
                        ? 'border-pink-500 bg-pink-500 text-white'
                        : 'border-gray-200 text-gray-700 hover:border-pink-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">What's your typical budget per item?</h2>
              <div className="grid grid-cols-2 gap-3">
                {BUDGETS.map(b => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBudgetRange(prev => prev === b.value ? '' : b.value)}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left flex items-center justify-between ${
                      budgetRange === b.value
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 text-gray-700 hover:border-pink-300'
                    }`}
                  >
                    {b.label}
                    {budgetRange === b.value && <Check className="w-4 h-4 text-pink-500" />}
                  </button>
                ))}
              </div>
            </section>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => submitSurvey(true)}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-medium hover:border-gray-300 transition-all disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4" />
                Skip for now
              </button>
              <button
                onClick={() => submitSurvey(false)}
                disabled={loading}
                className="flex-1 bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-all shadow-[0_0_15px_rgba(236,72,153,0.2)] flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? 'Saving…' : (
                  <>
                    Finish Setup
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
