import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Camera, User, Phone, MapPin, Mail, Lock, CheckCircle, AlertCircle,
  Eye, EyeOff, Save, RefreshCw, Shield, Upload, Store, ShoppingBag, Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PUT, POST } from '../lib/api';

const AVATAR_SEEDS = ['Briton','Amara','Brenda','Korir','Wanjiku','Otieno','Mutua','Njeri','Kamau','Oduya','Achieng','Mwangi'];

type Tab = 'profile' | 'security' | 'verify';

// ── Canvas-compress an uploaded image to ≤400px / 0.75 quality JPEG base64 ──
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = evt => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else        { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const ROLE_INFO = {
  BUYER: {
    label: 'Buyer',
    icon: ShoppingBag,
    color: 'bg-blue-100 text-blue-700',
    desc: 'Browse and purchase products from sellers on campus.',
  },
  SELLER: {
    label: 'Seller',
    icon: Store,
    color: 'bg-green-100 text-green-700',
    desc: 'List products and sell to students on campus.',
  },
  BOTH: {
    label: 'Buyer & Seller',
    icon: Layers,
    color: 'bg-purple-100 text-purple-700',
    desc: 'Full access — buy and sell on the marketplace.',
  },
};

export default function Profile() {
  const { user, refresh } = useAuth();
  const [searchParams]    = useSearchParams();

  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'profile');

  const [saving,           setSaving]           = useState(false);
  const [msg,              setMsg]              = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [uploading,        setUploading]        = useState(false);
  const [changingRole,     setChangingRole]     = useState(false);

  // Profile form
  const [form, setForm] = useState({ name: '', phone: '', campus: '', avatar: '' });

  // Password form
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ new: false, confirm: false });

  // Verification
  const [otpSent,    setOtpSent]    = useState(false);
  const [otp,        setOtp]        = useState(['', '', '', '', '', '']);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying,  setVerifying]  = useState(false);
  const [countdown,  setCountdown]  = useState(0);

  const otpRefs    = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', phone: user.phone || '', campus: user.campus || '', avatar: user.avatar || '' });
  }, [user]);

  useEffect(() => {
    if (!otpSent) return;
    setCountdown(600);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setOtpSent(false);
          setOtp(['', '', '', '', '', '']);
          showMsg('error', 'Code expired. Request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [otpSent]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 6000);
  };

  // ── OTP handlers ────────────────────────────────────────────────────────
  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const n = [...otp]; n[i] = v.slice(-1); setOtp(n);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setOtp(p.split('')); otpRefs.current[5]?.focus(); }
  };
  const otpCode = otp.join('');

  // ── Avatar file upload ───────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { showMsg('error', 'Image must be under 8 MB'); return; }
    setUploading(true);
    try {
      const base64 = await compressImage(file);
      setForm(f => ({ ...f, avatar: base64 }));
      setShowAvatarPicker(false);
    } catch { showMsg('error', 'Failed to process image'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const selectAvatar = (seed: string) => {
    setForm(f => ({ ...f, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}` }));
    setShowAvatarPicker(false);
  };

  // ── Profile save ─────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await PUT('/api/buyer/profile', form);
      await refresh();
      showMsg('success', 'Profile updated!');
    } catch (err: any) { showMsg('error', err.message || 'Failed to update profile'); }
    finally { setSaving(false); }
  };

  // ── Role change ──────────────────────────────────────────────────────────
  const handleChangeRole = async (newRole: 'SELLER' | 'BOTH') => {
    if (!user?.isVerified) { showMsg('error', 'Verify your email first (Verify tab)'); return; }
    setChangingRole(true);
    try {
      const res = await fetch('/api/buyer/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kampas_token')}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      // Persist new JWT so the role is updated immediately
      if (json.data?.token) localStorage.setItem('kampas_token', json.data.token);
      await refresh();
      showMsg('success', `Account upgraded to ${ROLE_INFO[newRole].label}!`);
    } catch (err: any) { showMsg('error', err.message || 'Failed to change account type'); }
    finally { setChangingRole(false); }
  };

  // ── Verification ─────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    setSendingOtp(true);
    setOtp(['', '', '', '', '', '']);
    try {
      await POST('/api/auth/send-verification', {});
      setOtpSent(true);
      showMsg('success', `Code sent to ${user?.email}. Check your inbox.`);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err: any) { showMsg('error', err.message || 'Failed to send code.'); }
    finally { setSendingOtp(false); }
  };

  const handleResendOTP = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setOtpSent(false);
    setOtp(['', '', '', '', '', '']);
    await handleSendOTP();
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) { showMsg('error', 'Enter all 6 digits'); return; }
    setVerifying(true);
    try {
      await POST('/api/auth/verify-email', { code: otpCode });
      await refresh();
      if (timerRef.current) clearInterval(timerRef.current);
      showMsg('success', '🎉 Email verified! Your account is now fully active.');
      setOtpSent(false);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      showMsg('error', err.message || 'Wrong code. Try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally { setVerifying(false); }
  };

  const currentAvatar = form.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'user'}`;
  const currentRole   = (user?.role ?? 'BUYER') as keyof typeof ROLE_INFO;
  const roleInfo      = ROLE_INFO[currentRole];

  // Which upgrades are available?
  const availableUpgrades = (() => {
    const order: Record<string, number> = { BUYER: 0, SELLER: 1, BOTH: 2 };
    const cur = order[currentRole] ?? 0;
    return (['SELLER', 'BOTH'] as const).filter(r => order[r] > cur);
  })();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account information and security.</p>
      </div>

      {/* Message banner */}
      {msg && (
        <div className={`mb-5 p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${
          msg.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {msg.type === 'success'
            ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-pink-50 border border-pink-200 rounded-xl p-1">
        {([
          { id: 'profile',  label: '👤 Profile' },
          { id: 'security', label: '🔒 Security' },
          { id: 'verify',   label: user?.isVerified ? '✅ Verified' : '⚠️ Verify' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ─────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="space-y-5">
          <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6 space-y-5">

            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <img
                  src={currentAvatar}
                  alt="Avatar"
                  className="w-20 h-20 rounded-2xl border-2 border-pink-300 bg-white object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=default`; }}
                />
                {uploading && (
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => setShowAvatarPicker(v => !v)}
                  className="absolute -bottom-2 -right-2 bg-pink-500 text-white p-1.5 rounded-lg shadow hover:bg-pink-600 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <p className="font-bold text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${roleInfo.color}`}>
                    <roleInfo.icon className="w-3 h-3" />{roleInfo.label}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    user?.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {user?.isVerified ? '✓ Verified' : '⚠ Unverified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Avatar picker */}
            {showAvatarPicker && (
              <div className="bg-white border border-pink-200 rounded-xl p-4 space-y-3">

                {/* File upload */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Upload a photo:</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-pink-300 rounded-xl py-3 text-sm text-pink-600 font-medium hover:bg-pink-50 transition-colors disabled:opacity-50"
                  >
                    {uploading
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                      : <><Upload className="w-4 h-4" /> Choose from device</>
                    }
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, GIF — max 8 MB. Resized automatically.</p>
                </div>

                {/* Preset avatars */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Or pick an avatar:</p>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_SEEDS.map(seed => (
                      <button key={seed} onClick={() => selectAvatar(seed)}
                        className="w-12 h-12 rounded-xl border-2 border-transparent hover:border-pink-500 overflow-hidden bg-pink-50 transition-all">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={seed} className="w-full h-full" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL input */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">Or paste an image URL:</p>
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={form.avatar.startsWith('data:') ? '' : form.avatar}
                    onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))}
                    className="w-full bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            )}

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'name',   label: 'Full Name',    icon: User,   type: 'text', placeholder: 'Your name' },
                { key: 'phone',  label: 'Phone Number', icon: Phone,  type: 'tel',  placeholder: '07XX XXX XXX' },
                { key: 'campus', label: 'Campus',       icon: MapPin, type: 'text', placeholder: 'E.g. JKUAT Main' },
              ].map(field => (
                <div key={field.key} className={field.key === 'campus' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{field.label}</label>
                  <div className="relative">
                    <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={field.type}
                      value={(form as any)[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-white border border-pink-200 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>
                </div>
              ))}

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-sm text-gray-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* ── Account Type ──────────────────────────────────────────────── */}
          <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900">Account Type</h3>
              <p className="text-xs text-gray-500 mt-0.5">Upgrade your account to unlock more features.</p>
            </div>

            {/* Current role card */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border-2 border-pink-300 bg-white`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${roleInfo.color}`}>
                <roleInfo.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">Current: {roleInfo.label}</p>
                <p className="text-xs text-gray-500">{roleInfo.desc}</p>
              </div>
              <span className="text-xs bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded-full flex-shrink-0">Active</span>
            </div>

            {availableUpgrades.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                You have the highest account tier — full marketplace access.
              </div>
            ) : (
              <>
                {!user?.isVerified && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>You need to <button onClick={() => setTab('verify')} className="font-bold underline hover:text-yellow-900">verify your email</button> before upgrading your account type.</span>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Upgrade to:</p>
                  {availableUpgrades.map(role => {
                    const info = ROLE_INFO[role];
                    return (
                      <div key={role} className="flex items-center gap-3 p-3 bg-white border border-pink-200 rounded-xl">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${info.color}`}>
                          <info.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{info.label}</p>
                          <p className="text-xs text-gray-500">{info.desc}</p>
                        </div>
                        <button
                          onClick={() => handleChangeRole(role)}
                          disabled={changingRole || !user?.isVerified}
                          className="flex-shrink-0 px-4 py-2 bg-pink-500 text-white text-xs font-bold rounded-lg hover:bg-pink-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                        >
                          {changingRole
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : null
                          }
                          Upgrade
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-white border border-pink-200 rounded-xl">
            <Shield className="w-5 h-5 text-pink-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Change Password</p>
              <p className="text-xs text-gray-400">Minimum 6 characters.</p>
            </div>
          </div>

          {[
            { key: 'newPassword',     label: 'New Password',     show: showPw.new,     toggle: () => setShowPw(s => ({ ...s, new: !s.new })) },
            { key: 'confirmPassword', label: 'Confirm Password', show: showPw.confirm, toggle: () => setShowPw(s => ({ ...s, confirm: !s.confirm })) },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{field.label}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={field.show ? 'text' : 'password'}
                  value={(pwForm as any)[field.key]}
                  onChange={e => setPwForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-white border border-pink-200 rounded-xl py-2.5 pl-9 pr-10 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
                <button type="button" onClick={field.toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            To reset your password securely, use the <strong>Forgot Password</strong> link on the login page. This sends a secure reset link to your email.
          </div>
        </div>
      )}

      {/* ── VERIFY TAB ──────────────────────────────────────────────────── */}
      {tab === 'verify' && (
        <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6">
          {user?.isVerified ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Account Verified!</h3>
              <p className="text-gray-500 text-sm">Your email is confirmed. You have full marketplace access.</p>
              {availableUpgrades.length > 0 && (
                <button
                  onClick={() => setTab('profile')}
                  className="mt-4 px-5 py-2 bg-pink-500 text-white text-sm font-bold rounded-xl hover:bg-pink-600 transition-colors"
                >
                  Upgrade Account Type →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Unverified Account</p>
                  <p className="text-xs text-yellow-700 mt-1">Verify your email to place orders, chat with sellers, and upgrade your account type.</p>
                </div>
              </div>

              <div className="bg-white border border-pink-200 rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold">Verify via Email OTP</p>
                  <p className="text-xs text-gray-400 mt-1">
                    A 6-digit code will be sent to <strong className="text-gray-600">{user?.email}</strong>
                  </p>
                </div>

                {!otpSent ? (
                  <button onClick={handleSendOTP} disabled={sendingOtp}
                    className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                    {sendingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {sendingOtp ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600 font-medium">✓ Code sent! Check your inbox.</span>
                      <span className={`font-bold ${countdown < 60 ? 'text-red-500' : 'text-gray-500'}`}>
                        Expires in {fmt(countdown)}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Enter the 6-digit code:</p>
                      <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={el => { otpRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl bg-white focus:outline-none transition-colors ${
                              digit ? 'border-pink-500 text-pink-600' : 'border-pink-200 text-gray-900'
                            } focus:border-pink-500`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 text-center mt-2">You can also paste the code directly.</p>
                    </div>

                    <button onClick={handleVerifyOTP} disabled={verifying || otpCode.length !== 6}
                      className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {verifying ? 'Verifying...' : 'Verify Email'}
                    </button>

                    <button onClick={handleResendOTP} disabled={sendingOtp}
                      className="w-full text-sm text-gray-500 hover:text-pink-600 transition-colors py-1 underline underline-offset-2">
                      {sendingOtp ? 'Sending...' : "Didn't get it? Send a new code"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
