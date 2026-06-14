import {
  Users, DollarSign, Package, AlertTriangle, Shield, TrendingUp, Search,
  Store, ShoppingCart, CreditCard, Megaphone, Calendar, HelpCircle, LayoutDashboard,
  Settings, Power, ChevronRight, Zap, Target,
  RefreshCw, CheckCircle, XCircle, Gift, ToggleLeft, ToggleRight,
  Award, Pencil, Save, ArrowUpRight, ArrowDownLeft, Wallet, BadgeCheck,
  Mail, Eye, EyeOff, Wifi, WifiOff, KeyRound
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET, PUT, POST } from '../lib/api';
import { socket } from '../lib/socket';

type TabType = 'dashboard' | 'users' | 'sellers' | 'products' | 'orders' | 'transactions' | 'ads' | 'events' | 'support' | 'kyc' | 'reports' | 'announcements' | 'settings';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [activeUsers,    setActiveUsers]    = useState<number>(0);
  const [activeTab,      setActiveTab]      = useState<TabType>('dashboard');
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(true);

  // Dashboard state
  const [stats,          setStats]          = useState<any>(null);
  const [loadingStats,   setLoadingStats]   = useState(true);
  const [analyticsData,  setAnalyticsData]  = useState<any[]>([]);

  // Per-tab data
  const [users,          setUsers]          = useState<any[]>([]);
  const [products,       setProducts]       = useState<any[]>([]);
  const [kyc,            setKyc]            = useState<any[]>([]);
  const [reports,        setReports]        = useState<any[]>([]);
  const [disputes,       setDisputes]       = useState<any[]>([]);
  const [ads,            setAds]            = useState<any[]>([]);
  const [transactions,   setTransactions]   = useState<any[]>([]);
  const [tabLoading,     setTabLoading]     = useState(false);
  const [userSearch,     setUserSearch]     = useState('');
  const [actionMsg,      setActionMsg]      = useState('');

  // Dispute resolve inline state
  const [resolvingId,    setResolvingId]    = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [refundBuyer,    setRefundBuyer]    = useState(false);

  // Support ticket state
  const [supportTickets,    setSupportTickets]    = useState<any[]>([]);
  const [selectedTicket,    setSelectedTicket]    = useState<any>(null);
  const [ticketReply,       setTicketReply]       = useState('');
  const [sendingReply,      setSendingReply]      = useState(false);

  // Announcement state
  const [annTitle,       setAnnTitle]       = useState('');
  const [annBody,        setAnnBody]        = useState('');
  const [annTarget,      setAnnTarget]      = useState<'ALL' | 'BUYERS' | 'SELLERS' | 'ADMINS'>('ALL');
  const [annSending,     setAnnSending]     = useState(false);
  const [annHistory,     setAnnHistory]     = useState<{ title: string; body: string; target: string; sentAt: string; count: number }[]>([]);

  // Settings tab state
  const [referralEnabled,   setReferralEnabled]   = useState(false);
  const [rewardAmount,      setRewardAmount]       = useState('50');
  const [rewardEditing,     setRewardEditing]      = useState(false);
  const [rewardDraft,       setRewardDraft]        = useState('50');
  const [settingsSaving,    setSettingsSaving]     = useState(false);
  const [referralStats,     setReferralStats]      = useState<any>(null);

  // Brevo settings state
  const [brevoApiKey,      setBrevoApiKey]      = useState('');
  const [brevoShowApiKey,  setBrevoShowApiKey]  = useState(false);
  const [brevoSmtpUser,    setBrevoSmtpUser]    = useState('');
  const [brevoSmtpPass,    setBrevoSmtpPass]    = useState('');
  const [brevoSenderName,  setBrevoSenderName]  = useState('Kampas');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('noreply@kampas.co.ke');
  const [brevoShowPass,    setBrevoShowPass]    = useState(false);
  const [brevoStatus,      setBrevoStatus]      = useState<'idle'|'testing'|'ok'|'error'>('idle');
  const [brevoMsg,         setBrevoMsg]         = useState('');

  // Paystack settings state
  const [psSecretKey,    setPsSecretKey]    = useState('');
  const [psPublicKey,    setPsPublicKey]    = useState('');
  const [psShowSecret,   setPsShowSecret]   = useState(false);
  const [psStatus,       setPsStatus]       = useState<'idle'|'testing'|'ok'|'error'>('idle');
  const [psMsg,          setPsMsg]          = useState('');

  useEffect(() => {
    socket.on('activeUsers', (count) => setActiveUsers(count));
    return () => { socket.off('activeUsers'); };
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        GET('/api/admin/stats'),
        GET('/api/admin/analytics'),
      ]);
      setStats(statsRes.data);
      const chart = analyticsRes.data?.chart || [];
      setAnalyticsData(chart.length ? chart : [
        { name: 'Mon', revenue: 0, users: 0, orders: 0 },
        { name: 'Tue', revenue: 0, users: 0, orders: 0 },
        { name: 'Wed', revenue: 0, users: 0, orders: 0 },
        { name: 'Thu', revenue: 0, users: 0, orders: 0 },
        { name: 'Fri', revenue: 0, users: 0, orders: 0 },
        { name: 'Sat', revenue: 0, users: 0, orders: 0 },
        { name: 'Sun', revenue: 0, users: 0, orders: 0 },
      ]);
    } catch (e) { console.error(e); }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fetchTabData = useCallback(async (tab: TabType) => {
    setTabLoading(true);
    try {
      if (tab === 'users' || tab === 'sellers') {
        const res = await GET('/api/admin/users');
        setUsers(res.data?.users || []);
      } else if (tab === 'products') {
        const res = await GET('/api/admin/products');
        setProducts(res.data?.products || []);
      } else if (tab === 'kyc') {
        const res = await GET('/api/admin/kyc');
        setKyc(res.data?.verifications || []);
      } else if (tab === 'reports') {
        const res = await GET('/api/admin/reports');
        setReports(res.data?.reports || []);
      } else if (tab === 'support') {
        const res = await GET('/api/admin/support');
        setSupportTickets(res.data?.tickets || []);
      } else if (tab === 'ads') {
        const res = await GET('/api/admin/ads');
        setAds(res.data?.ads || []);
      } else if (tab === 'transactions') {
        const res = await GET('/api/admin/transactions?limit=50');
        setTransactions(res.data?.transactions || []);
      } else if (tab === 'settings') {
        const [settingsRes, statsRes] = await Promise.all([
          GET('/api/admin/settings'),
          GET('/api/admin/referral-stats'),
        ]);
        const s = settingsRes.data?.settings || {};
        const enabled = s.referral_enabled === 'true';
        const amount = s.referral_reward_amount || '50';
        setReferralEnabled(enabled);
        setRewardAmount(amount);
        setRewardDraft(amount);
        setReferralStats(statsRes.data || null);
        if (s.brevo_api_key)      setBrevoApiKey(s.brevo_api_key);
        if (s.brevo_smtp_user)    setBrevoSmtpUser(s.brevo_smtp_user);
        if (s.brevo_smtp_pass)    setBrevoSmtpPass(s.brevo_smtp_pass);
        if (s.brevo_sender_name)  setBrevoSenderName(s.brevo_sender_name);
        if (s.brevo_sender_email) setBrevoSenderEmail(s.brevo_sender_email);
        if (s.paystack_secret_key) setPsSecretKey(s.paystack_secret_key);
        if (s.paystack_public_key) setPsPublicKey(s.paystack_public_key);
      }
    } catch (e) { console.error(e); }
    finally { setTabLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab !== 'dashboard' && activeTab !== 'events') fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  const showMsg = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  const handleSuspendUser = async (userId: string, active: boolean) => {
    try {
      await PUT(`/api/admin/users/${userId}/suspend`, { suspend: active });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !active } : u));
      showMsg(active ? 'User suspended' : 'User reactivated');
    } catch { showMsg('Action failed'); }
  };

  const handleApproveKyc = async (id: string, approved: boolean) => {
    try {
      if (approved) {
        await PUT(`/api/admin/kyc/${id}/approve`, {});
        setKyc(prev => prev.map(k => k.id === id ? { ...k, status: 'APPROVED' } : k));
        showMsg('KYC approved ✅');
      } else {
        const reason = window.prompt('Reason for rejection (required):');
        if (!reason?.trim()) return;
        await PUT(`/api/admin/kyc/${id}/reject`, { notes: reason.trim() });
        setKyc(prev => prev.map(k => k.id === id ? { ...k, status: 'REJECTED', notes: reason.trim() } : k));
        showMsg('KYC rejected — seller notified');
      }
    } catch { showMsg('Action failed'); }
  };

  const handleFeatureProduct = async (id: string, featured: boolean) => {
    try {
      await PUT(`/api/admin/products/${id}/feature`, { featured: !featured });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isFeatured: !featured } : p));
      showMsg(!featured ? 'Product featured ⭐' : 'Feature removed');
    } catch { showMsg('Action failed'); }
  };

  const handleApproveAd = async (id: string) => {
    try {
      await PUT(`/api/admin/ads/${id}/approve`, {});
      setAds(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a));
      showMsg('Ad approved ✅');
    } catch { showMsg('Action failed'); }
  };

  const handleResolveReport = async (id: string, action: 'DISMISS' | 'REMOVE_PRODUCT') => {
    try {
      await PUT(`/api/admin/reports/${id}/resolve`, { action });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'RESOLVED' } : r));
      showMsg(action === 'REMOVE_PRODUCT' ? '🗑 Product removed & report resolved' : '✅ Report dismissed');
    } catch { showMsg('Action failed'); }
  };

  const handleSendAnnouncement = async () => {
    if (!annTitle.trim() || annTitle.trim().length < 3) { showMsg('Title must be at least 3 characters'); return; }
    if (!annBody.trim() || annBody.trim().length < 10)  { showMsg('Message must be at least 10 characters'); return; }
    setAnnSending(true);
    try {
      const res = await POST('/api/admin/announcements', { title: annTitle.trim(), body: annBody.trim(), target: annTarget });
      const count = parseInt((res as any).message?.match(/\d+/)?.[0] ?? '0');
      setAnnHistory(prev => [{ title: annTitle.trim(), body: annBody.trim(), target: annTarget, sentAt: new Date().toISOString(), count }, ...prev]);
      setAnnTitle('');
      setAnnBody('');
      showMsg(`📣 ${(res as any).message}`);
    } catch { showMsg('Failed to send announcement'); }
    finally { setAnnSending(false); }
  };

  const handleResolveDispute = async (id: string) => {
    if (!resolutionText.trim() || resolutionText.trim().length < 10) {
      showMsg('Resolution must be at least 10 characters');
      return;
    }
    try {
      await PUT(`/api/admin/disputes/${id}/resolve`, { resolution: resolutionText.trim(), refundBuyer });
      setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'RESOLVED' } : d));
      setResolvingId(null);
      setResolutionText('');
      setRefundBuyer(false);
      showMsg(refundBuyer ? '✅ Dispute resolved — buyer refunded' : '✅ Dispute resolved');
    } catch { showMsg('Action failed'); }
  };

  const handleToggleReferral = async (newVal: boolean) => {
    setSettingsSaving(true);
    try {
      await PUT('/api/admin/settings', { referral_enabled: newVal ? 'true' : 'false' });
      setReferralEnabled(newVal);
      showMsg(newVal ? '✅ Referral program enabled' : '🔴 Referral program disabled');
    } catch { showMsg('Failed to update setting'); }
    finally { setSettingsSaving(false); }
  };

  const handleSaveRewardAmount = async () => {
    const val = parseFloat(rewardDraft);
    if (isNaN(val) || val < 1) { showMsg('Enter a valid amount (min KSH 1)'); return; }
    setSettingsSaving(true);
    try {
      await PUT('/api/admin/settings', { referral_reward_amount: String(val) });
      setRewardAmount(String(val));
      setRewardEditing(false);
      showMsg(`✅ Reward updated to KSH ${val}`);
    } catch { showMsg('Failed to update amount'); }
    finally { setSettingsSaving(false); }
  };

  const handleTestBrevo = async () => {
    setBrevoStatus('testing');
    setBrevoMsg('');
    try {
      const res = await POST('/api/admin/settings/test-brevo', {
        api_key:      brevoApiKey,
        smtp_user:    brevoSmtpUser,
        smtp_pass:    brevoSmtpPass,
        sender_name:  brevoSenderName,
        sender_email: brevoSenderEmail,
      });
      setBrevoStatus('ok');
      setBrevoMsg((res as any).message || 'Connection successful');
    } catch (e: any) {
      setBrevoStatus('error');
      setBrevoMsg(e?.response?.data?.message || e?.message || 'Connection failed');
    }
  };

  const handleTestPaystack = async () => {
    setPsStatus('testing');
    setPsMsg('');
    try {
      const res = await POST('/api/admin/settings/test-paystack', {
        secret_key: psSecretKey,
        public_key: psPublicKey,
      });
      setPsStatus('ok');
      setPsMsg((res as any).message || 'Connection successful');
    } catch (e: any) {
      setPsStatus('error');
      setPsMsg(e?.response?.data?.message || e?.message || 'Connection failed');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavItem = ({ id, label, icon: Icon, count }: { id: TabType, label: string, icon: any, count?: number }) => {
    const isActive = activeTab === id;
    return (
      <button onClick={() => setActiveTab(id)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-pink-500/10 text-pink-600 font-bold' : 'border border-transparent text-gray-600 hover:text-gray-900 hover:bg-pink-50'}`}>
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isActive ? 'text-pink-600' : 'group-hover:text-pink-500 transition-colors'}`} />
          {isSidebarOpen && <span className="text-sm tracking-wide">{label}</span>}
        </div>
        {isSidebarOpen && count !== undefined && count > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-500 text-white">{count}</span>
        )}
      </button>
    );
  };

  const StatCard = ({ label, value, sub, icon: Icon, color = 'pink' }: any) => (
    <div className="bg-white border border-pink-100 p-6 rounded-3xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-gray-500">{label}</span>
        <div className="p-2 rounded-xl bg-pink-50 text-pink-500"><Icon className="w-5 h-5" /></div>
      </div>
      <h3 className="text-3xl font-black mb-1 tracking-tight text-gray-900">{value}</h3>
      <p className="text-xs text-gray-400 font-medium">{sub}</p>
    </div>
  );

  const filteredUsers = users.filter(u => {
    if (activeTab === 'sellers') return u.role === 'SELLER';
    return !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
  });

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans selection:bg-pink-500 selection:text-white overflow-hidden relative">

      {/* Toast */}
      {actionMsg && (
        <div className="fixed top-4 right-4 z-[999] bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl">
          {actionMsg}
        </div>
      )}

      {/* Sidebar */}
      <aside className={`relative z-20 flex flex-col bg-white border-r border-pink-100 transition-all duration-500 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="p-6 border-b border-pink-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/kampas-logo.jpg" alt="Kampas" className="w-10 h-10 rounded-xl object-cover shadow-[0_0_15px_rgba(236,72,153,0.3)]" />
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight leading-none text-gray-900">Kampas <span className="text-pink-500 font-light">OS</span></span>
                <span className="text-[10px] text-pink-500 font-mono mt-1 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" /> Super Admin
                </span>
              </div>
            )}
          </Link>
          <button onClick={() => setIsSidebarOpen(o => !o)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full py-6 px-4 space-y-6 scrollbar-hide">
          <div className="space-y-1">
            {isSidebarOpen && <p className="text-[10px] text-gray-500 font-bold px-4 mb-3 uppercase tracking-widest">Command Center</p>}
            <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          </div>
          <div className="space-y-1">
            {isSidebarOpen && <p className="text-[10px] text-gray-500 font-bold px-4 mb-3 uppercase tracking-widest">Ecosystem</p>}
            <NavItem id="users"    label="User Matrix"       icon={Users}    count={stats?.users?.total} />
            <NavItem id="sellers"  label="Business Hub"      icon={Store}    count={stats?.users?.sellers} />
            <NavItem id="products" label="Global Inventory"  icon={Package}  count={stats?.products?.total} />
          </div>
          <div className="space-y-1">
            {isSidebarOpen && <p className="text-[10px] text-gray-500 font-bold px-4 mb-3 uppercase tracking-widest">Operations</p>}
            <NavItem id="ads"          label="Ad Network"       icon={Megaphone} count={stats?.ads?.pending} />
            <NavItem id="events"       label="Campus Events"    icon={Calendar} />
            <NavItem id="transactions" label="Financial Engine" icon={DollarSign} />
          </div>
          <div className="space-y-1">
            {isSidebarOpen && <p className="text-[10px] text-gray-500 font-bold px-4 mb-3 uppercase tracking-widest">Security</p>}
            <NavItem id="kyc"     label="KYC Gateway"    icon={Shield}        count={stats?.moderation?.pendingKyc} />
            <NavItem id="reports" label="Threat Reports"  icon={AlertTriangle} count={stats?.moderation?.pendingReports} />
            <NavItem id="support" label="Support Tickets" icon={HelpCircle} />
          </div>
          <div className="space-y-1">
            {isSidebarOpen && <p className="text-[10px] text-gray-500 font-bold px-4 mb-3 uppercase tracking-widest">Platform</p>}
            <NavItem id="announcements" label="Announcements" icon={Megaphone} />
            <NavItem id="settings"      label="Settings"      icon={Settings} />
          </div>
        </div>

        <div className="p-4 border-t border-pink-100">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Power className="w-5 h-5" />
            {isSidebarOpen && <span className="font-bold text-sm">Terminate Session</span>}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen bg-gray-50 relative z-10 overflow-hidden">
        <header className="h-20 bg-white border-b border-pink-100 flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search users, orders, products..." value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="bg-gray-100 border border-transparent rounded-xl py-2.5 pl-11 pr-4 text-sm w-80 focus:outline-none focus:border-pink-500 focus:bg-white text-gray-900 transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> System Nominal
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full font-bold">
              <Zap className="w-3 h-3" /> {activeUsers} online
            </div>
            <button onClick={fetchStats} className="w-9 h-9 bg-gray-50 border border-gray-200 hover:bg-pink-50 rounded-full flex items-center justify-center transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-10 h-10 rounded-full bg-pink-500 border-2 border-pink-200 flex items-center justify-center shadow-md">
              <span className="font-bold text-sm text-white">SU</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">

          {/* ── Dashboard ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Platform Overview</h1>
                <p className="text-gray-500 mt-1">Real-time Kampas ecosystem metrics</p>
              </div>
              {loadingStats ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => <div key={i} className="h-32 bg-pink-50 rounded-3xl animate-pulse" />)}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Users"      value={stats?.users?.total ?? 0}       sub={`+${stats?.users?.newToday ?? 0} today`}       icon={Users} />
                    <StatCard label="Active Sellers"   value={stats?.users?.sellers ?? 0}     sub={`${stats?.users?.buyers ?? 0} buyers`}          icon={Store} />
                    <StatCard label="Total Products"   value={stats?.products?.total ?? 0}    sub={`${stats?.products?.active ?? 0} active`}       icon={Package} />
                    <StatCard label="Total Orders"     value={stats?.orders?.total ?? 0}      sub={`${stats?.orders?.pending ?? 0} pending`}       icon={ShoppingCart} />
                    <StatCard label="Total Revenue"    value={`KSH ${(stats?.revenue?.total ?? 0).toLocaleString()}`} sub={`Week: KSH ${(stats?.revenue?.week ?? 0).toLocaleString()}`} icon={DollarSign} />
                    <StatCard label="Platform Fees"    value={`KSH ${(stats?.platformFees ?? 0).toLocaleString()}`}  sub="5% of delivered orders"     icon={CreditCard} />
                    <StatCard label="Pending KYC"      value={stats?.moderation?.pendingKyc ?? 0}   sub="Awaiting review"         icon={Shield} />
                    <StatCard label="Open Disputes"    value={stats?.moderation?.openDisputes ?? 0} sub="Need resolution"         icon={AlertTriangle} />
                  </div>
                  <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-black text-gray-900">7-Day Platform Trends</h3>
                      <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-pink-500 rounded-full inline-block" />Revenue (KSH)</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-blue-400 rounded-full inline-block" />New Users</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={analyticsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: any, name: string) => [
                          name === 'revenue' ? `KSH ${Number(value).toLocaleString()}` : value,
                          name === 'revenue' ? 'Revenue' : 'New Users',
                        ]} />
                        <Area yAxisId="left"  type="monotone" dataKey="revenue" stroke="#ec4899" fill="#fce7f3" strokeWidth={2} dot={false} />
                        <Area yAxisId="right" type="monotone" dataKey="users"   stroke="#60a5fa" fill="#eff6ff" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Users / Sellers ── */}
          {(activeTab === 'users' || activeTab === 'sellers') && (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-black text-gray-900">{activeTab === 'sellers' ? 'Seller Hub' : 'User Matrix'}</h1>
                  <p className="text-gray-500 mt-1">{filteredUsers.length} {activeTab === 'sellers' ? 'sellers' : 'users'} found</p>
                </div>
              </div>
              {tabLoading ? <div className="h-64 bg-pink-50 rounded-3xl animate-pulse" /> : (
                <div className="bg-white border border-pink-100 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-pink-50 border-b border-pink-100">
                      <tr>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">User</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Campus</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Role</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Verified</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Joined</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Status</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pink-50">
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-12 text-gray-400">No users found</td></tr>
                      ) : filteredUsers.map((u: any) => (
                        <tr key={u.id} className="hover:bg-pink-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                                className="w-8 h-8 rounded-full" alt={u.name} />
                              <div>
                                <p className="font-semibold text-gray-900">{u.name}</p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs">{u.campus || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'SELLER' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.isVerified
                              ? <span className="flex items-center gap-1 text-xs font-bold text-blue-600"><BadgeCheck className="w-3.5 h-3.5" />Verified</span>
                              : <span className="text-xs text-gray-400">Unverified</span>}
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString('en-KE')}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {u.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.role !== 'ADMIN' && (
                              <button onClick={() => handleSuspendUser(u.id, u.isActive)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                {u.isActive ? 'Suspend' : 'Reactivate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Products ── */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-black text-gray-900">Global Inventory</h1>
              {tabLoading ? <div className="h-64 bg-pink-50 rounded-3xl animate-pulse" /> : (
                <div className="bg-white border border-pink-100 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-pink-50 border-b border-pink-100">
                      <tr>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Product</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Price</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Campus</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Stock</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Featured</th>
                        <th className="text-left px-6 py-4 font-bold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pink-50">
                      {products.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 text-gray-400">No products found</td></tr>
                      ) : products.map((p: any) => (
                        <tr key={p.id} className="hover:bg-pink-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={p.images?.[0]?.url || 'https://via.placeholder.com/40'}
                                className="w-10 h-10 rounded-xl object-cover" alt={p.title} />
                              <p className="font-semibold text-gray-900 max-w-[160px] truncate">{p.title}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-pink-600">KSH {p.price?.toLocaleString()}</td>
                          <td className="px-6 py-4 text-xs text-gray-500">{p.campus}</td>
                          <td className="px-6 py-4 text-gray-700">{p.stock}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.isFeatured ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                              {p.isFeatured ? '⭐ Featured' : 'Standard'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => handleFeatureProduct(p.id, p.isFeatured)}
                              className="text-xs font-bold px-3 py-1.5 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-lg transition-colors">
                              {p.isFeatured ? 'Unfeature' : 'Feature ⭐'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── KYC ── */}
          {activeTab === 'kyc' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-3xl font-black text-gray-900">KYC Gateway</h1>
                <div className="flex gap-2">
                  {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                    <button key={s} onClick={async () => {
                      setTabLoading(true);
                      try { const r = await GET(`/api/admin/kyc?status=${s}`); setKyc(r.data.verifications); } catch {}
                      finally { setTabLoading(false); }
                    }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        s === 'PENDING'  ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' :
                        s === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' :
                        'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {tabLoading ? <div className="h-64 bg-pink-50 rounded-3xl animate-pulse" /> : (
                kyc.length === 0 ? (
                  <div className="bg-white border border-pink-100 rounded-3xl p-12 text-center shadow-sm">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-bold text-gray-900 mb-2">No KYC Applications</p>
                    <p className="text-sm text-gray-500">Seller verification requests will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {kyc.map((k: any) => (
                      <div key={k.id} className="bg-white border border-pink-100 rounded-3xl p-6 shadow-sm space-y-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {k.seller?.avatar
                              ? <img src={k.seller.avatar} className="w-10 h-10 rounded-full object-cover" />
                              : <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center font-bold text-pink-500">{k.seller?.name?.[0]}</div>
                            }
                            <div>
                              <p className="font-bold text-gray-900">{k.seller?.name}</p>
                              <p className="text-xs text-gray-400">{k.seller?.email} · {k.seller?.campus}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Submitted: {new Date(k.createdAt).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${k.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : k.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {k.status}
                          </span>
                        </div>

                        {/* KYC details */}
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-4">
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Full Name</p>
                            <p className="font-bold text-gray-900 mt-0.5">{k.fullName || <span className="text-gray-400 italic font-normal">Not provided</span>}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID Number</p>
                            <p className="font-bold text-gray-900 mt-0.5">{k.idNumber || <span className="text-gray-400 italic font-normal">Not provided</span>}</p>
                          </div>
                        </div>

                        {/* ID images */}
                        {(k.idFront || k.idBack) && (
                          <div className="grid grid-cols-2 gap-3">
                            {k.idFront && (
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">ID Front</p>
                                <a href={k.idFront} target="_blank" rel="noreferrer" className="block">
                                  <img src={k.idFront} className="w-full h-36 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity" />
                                </a>
                              </div>
                            )}
                            {k.idBack && (
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">ID Back</p>
                                <a href={k.idBack} target="_blank" rel="noreferrer" className="block">
                                  <img src={k.idBack} className="w-full h-36 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Rejection note */}
                        {k.status === 'REJECTED' && k.notes && (
                          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                            <span className="font-bold">Rejection reason:</span> {k.notes}
                          </div>
                        )}

                        {/* Actions */}
                        {k.status === 'PENDING' && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleApproveKyc(k.id, true)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors">
                              <CheckCircle className="w-4 h-4" /> Approve
                            </button>
                            <button onClick={() => handleApproveKyc(k.id, false)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── Ads ── */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <Megaphone className="w-8 h-8 text-pink-500" /> Kampas Ad Network
              </h1>
              {tabLoading ? <div className="h-64 bg-pink-50 rounded-3xl animate-pulse" /> : (
                ads.length === 0 ? (
                  <div className="bg-white border border-pink-100 rounded-3xl p-12 text-center shadow-sm">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-bold text-gray-900 mb-2">No Ads Yet</p>
                    <p className="text-sm text-gray-500">Seller ad campaigns will appear here for review.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ads.map((ad: any) => (
                      <div key={ad.id} className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {ad.image && <img src={ad.image} className="w-12 h-12 rounded-xl object-cover" alt={ad.title} />}
                          <div>
                            <p className="font-bold text-gray-900">{ad.title}</p>
                            <p className="text-xs text-gray-400">{ad.seller?.name} · Budget: KSH {ad.budget?.toLocaleString()}</p>
                            <span className={`mt-1 inline-block text-xs font-bold px-2 py-0.5 rounded-full ${ad.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : ad.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {ad.status}
                            </span>
                          </div>
                        </div>
                        {ad.status === 'PENDING' && (
                          <button onClick={() => handleApproveAd(ad.id)}
                            className="text-sm font-bold px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors">
                            Approve
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── Reports ── */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-black text-gray-900">Threat Reports</h1>
              {tabLoading ? <div className="h-64 bg-pink-50 rounded-3xl animate-pulse" /> : (
                reports.length === 0 ? (
                  <div className="bg-white border border-pink-100 rounded-3xl p-12 text-center shadow-sm">
                    <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-bold text-gray-900 mb-2">No Reports</p>
                    <p className="text-sm text-gray-500">Product and user reports will show here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((r: any) => (
                      <div key={r.id} className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            {r.product?.images?.[0]?.url && (
                              <img src={r.product.images[0].url} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt={r.product.title} />
                            )}
                            <div>
                              <p className="font-bold text-gray-900">{r.product?.title || 'Unknown Product'}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Seller: {r.product?.seller?.name || '—'} · Reported by: {r.user?.name || '—'}</p>
                              <p className="text-xs text-gray-500 mt-1">Reason: <span className="font-semibold">{r.reason}</span></p>
                              {r.details && <p className="text-xs text-gray-400 mt-0.5 italic">"{r.details}"</p>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                              {r.status}
                            </span>
                            {r.status === 'PENDING' && (
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => handleResolveReport(r.id, 'DISMISS')}
                                  className="text-xs font-bold px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                                  Dismiss
                                </button>
                                <button onClick={() => handleResolveReport(r.id, 'REMOVE_PRODUCT')}
                                  className="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                                  Remove Product
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── Disputes ── */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-3xl font-black text-gray-900">Support Tickets</h1>
                <div className="flex gap-2">
                  {['OPEN','IN_PROGRESS','CLOSED'].map(s => (
                    <button key={s} onClick={async () => {
                      setTabLoading(true);
                      setSelectedTicket(null);
                      try { const r = await GET(`/api/admin/support?status=${s}`); setSupportTickets(r.data?.tickets || []); } catch {}
                      finally { setTabLoading(false); }
                    }} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      s === 'OPEN'        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' :
                      s === 'IN_PROGRESS' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' :
                      'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}>
                      {s.replace('_',' ')}
                    </button>
                  ))}
                </div>
              </div>

              {tabLoading ? <div className="h-64 bg-pink-50 rounded-3xl animate-pulse" /> : selectedTicket ? (
                /* ── Thread view ── */
                <div className="bg-white border border-pink-100 rounded-3xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-5 border-b border-pink-100">
                    <div>
                      <button onClick={() => setSelectedTicket(null)} className="text-xs text-pink-500 font-bold mb-1 hover:underline">← Back to list</button>
                      <h3 className="font-bold text-gray-900">{selectedTicket.subject}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{selectedTicket.user?.name} · {selectedTicket.user?.email} · {selectedTicket.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedTicket.status === 'OPEN' ? 'bg-red-100 text-red-600' : selectedTicket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {selectedTicket.status}
                      </span>
                      {selectedTicket.status !== 'CLOSED' && (
                        <button onClick={async () => {
                          await PUT(`/api/admin/support/${selectedTicket.id}/close`, {});
                          setSelectedTicket((t: any) => ({ ...t, status: 'CLOSED' }));
                          setSupportTickets(prev => prev.map((t: any) => t.id === selectedTicket.id ? { ...t, status: 'CLOSED' } : t));
                          showMsg('Ticket closed');
                        }} className="text-xs font-bold px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">
                          Close Ticket
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
                    {selectedTicket.messages?.map((m: any) => (
                      <div key={m.id} className={`flex gap-3 ${m.senderRole === 'ADMIN' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${m.senderRole === 'ADMIN' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {m.senderRole === 'ADMIN' ? 'A' : selectedTicket.user?.name?.[0] || 'U'}
                        </div>
                        <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${m.senderRole === 'ADMIN' ? 'bg-pink-500 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                          <p>{m.message}</p>
                          <p className={`text-[10px] mt-1 ${m.senderRole === 'ADMIN' ? 'text-pink-200' : 'text-gray-400'}`}>
                            {new Date(m.createdAt).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedTicket.status !== 'CLOSED' && (
                    <div className="p-5 border-t border-pink-100 flex gap-3">
                      <textarea value={ticketReply} onChange={e => setTicketReply(e.target.value)}
                        rows={2} placeholder="Type your reply…"
                        className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-pink-400 resize-none" />
                      <button disabled={sendingReply || !ticketReply.trim()} onClick={async () => {
                        if (!ticketReply.trim()) return;
                        setSendingReply(true);
                        try {
                          await POST(`/api/admin/support/${selectedTicket.id}/reply`, { message: ticketReply.trim() });
                          const refreshed = await GET(`/api/admin/support/${selectedTicket.id}`);
                          setSelectedTicket(refreshed.data.ticket);
                          setTicketReply('');
                          showMsg('Reply sent ✅');
                        } catch { showMsg('Failed to send reply'); }
                        finally { setSendingReply(false); }
                      }} className="self-end bg-pink-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-pink-600 transition-colors disabled:opacity-60 flex items-center gap-2">
                        {sendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        Send
                      </button>
                    </div>
                  )}
                </div>
              ) : supportTickets.length === 0 ? (
                <div className="bg-white border border-pink-100 rounded-3xl p-12 text-center shadow-sm">
                  <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-bold text-gray-900 mb-2">No Support Tickets</p>
                  <p className="text-sm text-gray-500">User support requests will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supportTickets.map((t: any) => (
                    <button key={t.id} onClick={async () => {
                      setTabLoading(true);
                      try { const r = await GET(`/api/admin/support/${t.id}`); setSelectedTicket(r.data.ticket); setTicketReply(''); } catch {}
                      finally { setTabLoading(false); }
                    }} className="w-full bg-white border border-pink-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-pink-300 transition-all text-left">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {t.user?.avatar
                            ? <img src={t.user.avatar} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                            : <div className="w-9 h-9 rounded-full bg-pink-100 flex-shrink-0 flex items-center justify-center font-bold text-pink-500 text-sm">{t.user?.name?.[0]}</div>
                          }
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{t.subject}</p>
                            <p className="text-xs text-gray-400 truncate">{t.user?.name} · {t.category}</p>
                            {t.messages?.[0] && <p className="text-xs text-gray-500 truncate mt-0.5">"{t.messages[0].message}"</p>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'OPEN' ? 'bg-red-100 text-red-600' : t.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {t.status.replace('_',' ')}
                          </span>
                          <span className="text-[10px] text-gray-400">{new Date(t.updatedAt).toLocaleDateString('en-KE', { day:'numeric', month:'short' })}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mb-4" />
              <p className="font-bold text-gray-900 mb-2">Campus Events</p>
              <p className="text-sm text-gray-500 mb-4">View and manage all campus events from the Events page.</p>
              <Link to="/events" className="px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-bold hover:bg-pink-600 transition-colors">
                Go to Events
              </Link>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-black text-gray-900">Financial Engine</h1>
                <p className="text-gray-500 mt-1">Platform wallet transactions — last 50</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total Revenue"   value={`KSH ${(stats?.revenue?.total ?? 0).toLocaleString()}`}  sub="All-time delivered orders" icon={DollarSign} />
                <StatCard label="This Month"      value={`KSH ${(stats?.revenue?.month ?? 0).toLocaleString()}`}  sub="Month-to-date"            icon={TrendingUp} />
                <StatCard label="Platform Fees"   value={`KSH ${(stats?.platformFees ?? 0).toLocaleString()}`}    sub="5% commission earned"     icon={CreditCard} />
              </div>
              {tabLoading ? <div className="h-64 bg-pink-50 rounded-3xl animate-pulse" /> : (
                transactions.length === 0 ? (
                  <div className="bg-white border border-pink-100 rounded-3xl p-12 text-center shadow-sm">
                    <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-bold text-gray-900 mb-2">No Transactions Yet</p>
                    <p className="text-sm text-gray-500">Wallet transactions will appear here as users transact.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-pink-100 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-pink-50 border-b border-pink-100">
                        <tr>
                          <th className="text-left px-6 py-4 font-bold text-gray-600">User</th>
                          <th className="text-left px-6 py-4 font-bold text-gray-600">Type</th>
                          <th className="text-left px-6 py-4 font-bold text-gray-600">Amount</th>
                          <th className="text-left px-6 py-4 font-bold text-gray-600">Balance After</th>
                          <th className="text-left px-6 py-4 font-bold text-gray-600">Description</th>
                          <th className="text-left px-6 py-4 font-bold text-gray-600">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pink-50">
                        {transactions.map((t: any) => {
                          const isCredit = ['DEPOSIT', 'REFERRAL_REWARD', 'REFUND', 'SALE_CREDIT'].includes(t.type);
                          return (
                            <tr key={t.id} className="hover:bg-pink-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <img src={t.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.user?.name}`}
                                    className="w-7 h-7 rounded-full" alt={t.user?.name} />
                                  <div>
                                    <p className="font-semibold text-gray-900 text-xs">{t.user?.name}</p>
                                    <p className="text-[10px] text-gray-400">{t.user?.role}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`flex items-center gap-1.5 text-xs font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                                  {isCredit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                  {t.type.replace(/_/g, ' ')}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`font-black text-sm ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                                  {isCredit ? '+' : '-'}KSH {t.amount?.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-600 text-xs font-semibold">
                                KSH {t.balance?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-gray-500 text-xs max-w-[200px] truncate">{t.description || '—'}</td>
                              <td className="px-6 py-4 text-gray-400 text-xs">{new Date(t.createdAt).toLocaleDateString('en-KE')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}

          {/* ── Announcements ── */}
          {activeTab === 'announcements' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Announcements</h1>
                <p className="text-gray-500 mt-1">Broadcast messages directly to users' Kampas notification inbox</p>
              </div>

              {/* Compose */}
              <div className="bg-white border border-pink-100 rounded-3xl p-8 shadow-sm space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Compose Announcement</h2>
                    <p className="text-sm text-gray-500">Sent instantly as in-app notifications</p>
                  </div>
                </div>

                {/* Target selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Audience</label>
                  <div className="flex flex-wrap gap-2">
                    {(['ALL', 'BUYERS', 'SELLERS', 'ADMINS'] as const).map(t => (
                      <button key={t} onClick={() => setAnnTarget(t)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${annTarget === t ? 'bg-pink-500 text-white border-pink-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'}`}>
                        {t === 'ALL' ? '🌍 All Users' : t === 'BUYERS' ? '🛍 Buyers Only' : t === 'SELLERS' ? '🏪 Sellers Only' : '🔑 Admins Only'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. 🎉 Kampas New Feature Alert!"
                    value={annTitle}
                    onChange={e => setAnnTitle(e.target.value)}
                    maxLength={100}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{annTitle.length}/100</p>
                </div>

                {/* Body */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Message</label>
                  <textarea
                    rows={4}
                    placeholder="Write your announcement here… Keep it clear and actionable."
                    value={annBody}
                    onChange={e => setAnnBody(e.target.value)}
                    maxLength={500}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-400 resize-none bg-gray-50 focus:bg-white transition-colors"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{annBody.length}/500</p>
                </div>

                <button
                  onClick={handleSendAnnouncement}
                  disabled={annSending || !annTitle.trim() || !annBody.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-xl font-bold text-sm hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Megaphone className="w-4 h-4" />
                  {annSending ? 'Sending…' : 'Send Announcement'}
                </button>
              </div>

              {/* History */}
              {annHistory.length > 0 && (
                <div className="bg-white border border-pink-100 rounded-3xl p-8 shadow-sm">
                  <h2 className="text-lg font-black text-gray-900 mb-5">Sent This Session</h2>
                  <div className="space-y-3">
                    {annHistory.map((a, i) => (
                      <div key={i} className="flex items-start justify-between gap-4 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">{a.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.body}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-pink-100 text-pink-700">{a.target}</span>
                          <p className="text-[10px] text-gray-400 mt-1">{a.count} recipients</p>
                          <p className="text-[10px] text-gray-400">{new Date(a.sentAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {annHistory.length === 0 && (
                <div className="bg-white border border-pink-100 rounded-3xl p-12 text-center shadow-sm">
                  <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="font-bold text-gray-900 mb-1">No announcements sent yet</p>
                  <p className="text-sm text-gray-400">Compose your first announcement above to reach your users instantly.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Settings ── */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Platform Settings</h1>
                <p className="text-gray-500 mt-1">Configure Kampas platform features and rewards</p>
              </div>

              {tabLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-pink-50 rounded-3xl animate-pulse" />)}
                </div>
              ) : (
                <>
                  {/* ── Brevo Email Integration Card ── */}
                  <div className="bg-white border border-pink-100 rounded-3xl p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-gray-900">Brevo Email Integration</h2>
                        <p className="text-sm text-gray-500">Configure Brevo API key for transactional emails (OTPs, welcome, order updates)</p>
                      </div>
                    </div>

                    {/* API Key section — recommended */}
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">RECOMMENDED</span>
                        <span className="text-sm font-bold text-blue-800">Brevo v3 API Key</span>
                      </div>
                      <p className="text-xs text-blue-600">Get it from <strong>brevo.com → profile icon → SMTP &amp; API → API Keys tab → Generate a new API key</strong></p>
                      <div className="relative">
                        <input
                          type={brevoShowApiKey ? 'text' : 'password'}
                          value={brevoApiKey}
                          onChange={e => { setBrevoApiKey(e.target.value); setBrevoStatus('idle'); }}
                          placeholder="xkeysib-..."
                          className="w-full px-4 py-3 pr-12 rounded-xl border border-blue-200 bg-white text-sm font-medium text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <button onClick={() => setBrevoShowApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {brevoShowApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Sender fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sender Name</label>
                        <input
                          type="text"
                          value={brevoSenderName}
                          onChange={e => { setBrevoSenderName(e.target.value); setBrevoStatus('idle'); }}
                          placeholder="Kampas"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sender Email</label>
                        <input
                          type="email"
                          value={brevoSenderEmail}
                          onChange={e => { setBrevoSenderEmail(e.target.value); setBrevoStatus('idle'); }}
                          placeholder="noreply@kampas.co.ke"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                        />
                      </div>
                    </div>

                    {/* SMTP fallback (collapsed details) */}
                    <details className="group">
                      <summary className="cursor-pointer text-xs text-gray-400 font-semibold hover:text-gray-600 select-none">
                        Use SMTP instead (legacy) ▸
                      </summary>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">SMTP Login (Email)</label>
                          <input
                            type="text"
                            value={brevoSmtpUser}
                            onChange={e => { setBrevoSmtpUser(e.target.value); setBrevoStatus('idle'); }}
                            placeholder="your@brevo-account.com"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">SMTP Key (Password)</label>
                          <div className="relative">
                            <input
                              type={brevoShowPass ? 'text' : 'password'}
                              value={brevoSmtpPass}
                              onChange={e => { setBrevoSmtpPass(e.target.value); setBrevoStatus('idle'); }}
                              placeholder="From Brevo SMTP tab"
                              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                            />
                            <button onClick={() => setBrevoShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {brevoShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </details>

                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={handleTestBrevo}
                        disabled={brevoStatus === 'testing'}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
                      >
                        {brevoStatus === 'testing' ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Testing...</>
                        ) : (
                          <><Wifi className="w-4 h-4" /> Save &amp; Test Connection</>
                        )}
                      </button>
                      {brevoMsg && (
                        <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl ${brevoStatus === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                          {brevoStatus === 'ok' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {brevoMsg}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Paystack Integration Card ── */}
                  <div className="bg-white border border-pink-100 rounded-3xl p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-gray-900">Paystack Integration</h2>
                        <p className="text-sm text-gray-500">Configure Paystack API keys for wallet top-ups and M-Pesa STK push payments</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Secret Key</label>
                        <div className="relative">
                          <input
                            type={psShowSecret ? 'text' : 'password'}
                            value={psSecretKey}
                            onChange={e => { setPsSecretKey(e.target.value); setPsStatus('idle'); }}
                            placeholder="sk_live_..."
                            className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                          />
                          <button onClick={() => setPsShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {psShowSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Public Key</label>
                        <input
                          type="text"
                          value={psPublicKey}
                          onChange={e => { setPsPublicKey(e.target.value); setPsStatus('idle'); }}
                          placeholder="pk_live_..."
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={handleTestPaystack}
                        disabled={psStatus === 'testing'}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
                      >
                        {psStatus === 'testing' ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Testing...</>
                        ) : (
                          <><Wifi className="w-4 h-4" /> Save &amp; Test Connection</>
                        )}
                      </button>
                      {psMsg && (
                        <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl ${psStatus === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                          {psStatus === 'ok' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {psMsg}
                        </div>
                      )}
                    </div>

                    <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4 text-sm text-green-700">
                      <p className="font-bold mb-1">How to get your Paystack API keys:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-green-600">
                        <li>Log in to <strong>dashboard.paystack.com</strong></li>
                        <li>Go to <strong>Settings → API Keys &amp; Webhooks</strong></li>
                        <li>Copy your <strong>Secret Key</strong> and <strong>Public Key</strong></li>
                        <li>Use <strong>Test keys</strong> during development, <strong>Live keys</strong> in production</li>
                      </ol>
                    </div>
                  </div>

                  {/* Referral Program Card */}
                  <div className="bg-white border border-pink-100 rounded-3xl p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-gray-900">Referral Program</h2>
                        <p className="text-sm text-gray-500">Reward users who bring new members to Kampas</p>
                      </div>
                    </div>

                    {/* Enable / Disable toggle */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-6 py-5 border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-900">Enable Referral Rewards</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          When enabled, users earn wallet credits for every new sign-up using their code
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleReferral(!referralEnabled)}
                        disabled={settingsSaving}
                        className="flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {referralEnabled ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl font-bold text-sm">
                            <ToggleRight className="w-5 h-5" /> Enabled
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold text-sm">
                            <ToggleLeft className="w-5 h-5" /> Disabled
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Reward Amount */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-6 py-5 border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-900">Reward Amount</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Wallet credit given to the referrer per successful sign-up
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {rewardEditing ? (
                          <>
                            <div className="flex items-center gap-2 bg-white border border-pink-300 rounded-xl px-3 py-2 shadow-sm">
                              <span className="text-sm font-bold text-gray-500">KSH</span>
                              <input
                                type="number"
                                min="1"
                                value={rewardDraft}
                                onChange={e => setRewardDraft(e.target.value)}
                                className="w-20 text-right font-black text-gray-900 text-sm outline-none bg-transparent"
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={handleSaveRewardAmount}
                              disabled={settingsSaving}
                              className="flex items-center gap-1.5 px-4 py-2 bg-pink-500 text-white rounded-xl font-bold text-sm hover:bg-pink-600 transition-colors disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" /> Save
                            </button>
                            <button
                              onClick={() => { setRewardEditing(false); setRewardDraft(rewardAmount); }}
                              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-black text-pink-600">KSH {rewardAmount}</span>
                            <button
                              onClick={() => setRewardEditing(true)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-pink-50 hover:text-pink-600 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status banner */}
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold ${referralEnabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {referralEnabled ? (
                        <><CheckCircle className="w-4 h-4" /> Referral program is <strong>live</strong>. New users signing up with a referral code will automatically credit the referrer KSH {rewardAmount}.</>
                      ) : (
                        <><XCircle className="w-4 h-4" /> Referral program is <strong>disabled</strong>. Referral codes won't trigger any rewards until you enable it above.</>
                      )}
                    </div>
                  </div>

                  {/* Referral Stats Card */}
                  <div className="bg-white border border-pink-100 rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center">
                        <Award className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-gray-900">Referral Stats</h2>
                        <p className="text-sm text-gray-500">All-time referral program performance</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-pink-50 rounded-2xl p-5 border border-pink-100 text-center">
                        <p className="text-3xl font-black text-pink-600">{referralStats?.totalReferrals ?? 0}</p>
                        <p className="text-sm font-semibold text-gray-600 mt-1">Total Sign-ups via Referral</p>
                      </div>
                      <div className="bg-green-50 rounded-2xl p-5 border border-green-100 text-center">
                        <p className="text-3xl font-black text-green-600">KSH {(referralStats?.totalCreditsAwarded ?? 0).toLocaleString()}</p>
                        <p className="text-sm font-semibold text-gray-600 mt-1">Total Credits Awarded</p>
                      </div>
                      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 text-center">
                        <p className="text-3xl font-black text-blue-600">{referralStats?.totalRewardTxns ?? 0}</p>
                        <p className="text-sm font-semibold text-gray-600 mt-1">Reward Transactions</p>
                      </div>
                    </div>

                    {/* Top Referrers */}
                    {referralStats?.topReferrers?.length > 0 && (
                      <div>
                        <p className="text-sm font-black text-gray-700 uppercase tracking-widest mb-3">Top Referrers</p>
                        <div className="space-y-2">
                          {referralStats.topReferrers.map((u: any, i: number) => (
                            <div key={u.id} className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3">
                              <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
                              <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} className="w-8 h-8 rounded-full" alt={u.name} />
                              <div className="flex-1">
                                <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                              </div>
                              <span className="text-sm font-black text-pink-600">{u._count.referrals} referral{u._count.referrals !== 1 ? 's' : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!referralStats?.topReferrers?.length) && (
                      <div className="text-center py-8 text-gray-400">
                        <Gift className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="font-semibold">No referrals yet</p>
                        <p className="text-sm">Enable the referral program and share codes to get started</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
