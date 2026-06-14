import { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GET } from '../lib/api';
import WalletModal from '../components/WalletModal';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  reference?: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: 'in' | 'out' }> = {
  TOPUP:      { label: 'Top Up',     color: 'text-green-600',  bg: 'bg-green-50',  icon: 'in'  },
  PAYMENT:    { label: 'Payment',    color: 'text-red-500',    bg: 'bg-red-50',    icon: 'out' },
  REFUND:     { label: 'Refund',     color: 'text-blue-600',   bg: 'bg-blue-50',   icon: 'in'  },
  WITHDRAWAL: { label: 'Withdrawal', color: 'text-orange-500', bg: 'bg-orange-50', icon: 'out' },
  BONUS:      { label: 'Bonus',      color: 'text-purple-600', bg: 'bg-purple-50', icon: 'in'  },
};

const STATUS_STYLES: Record<string, string> = {
  SUCCESS:  'bg-green-100 text-green-700',
  PENDING:  'bg-yellow-100 text-yellow-700',
  FAILED:   'bg-red-100 text-red-700',
};

export default function WalletPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [showModal,    setShowModal]    = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  const loadTransactions = async (p = 1, reset = false) => {
    try {
      const res = await GET(`/api/buyer/wallet/transactions?page=${p}&limit=20`);
      const data = res.data;
      setTransactions(prev => reset || p === 1 ? data.transactions : [...prev, ...data.transactions]);
      setTotalPages(data.pages ?? 1);
      setPage(p);
    } catch (err) { console.error(err); }
  };

  const load = async () => {
    setLoading(true);
    await Promise.all([loadTransactions(1, true), refresh()]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const balance = user?.walletBalance ?? 0;

  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-pink-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-pink-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg flex-1">My Wallet</h1>
        <button onClick={handleRefresh} disabled={refreshing}
          className="p-2 rounded-xl hover:bg-pink-50 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Balance card */}
        <div className="relative bg-gradient-to-br from-pink-500 to-pink-600 rounded-3xl p-6 text-white overflow-hidden shadow-lg">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-12 -left-8 w-48 h-48 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">Kampas Wallet Balance</span>
            </div>
            <p className="text-4xl font-black tracking-tight mt-2">
              KSH {balance.toLocaleString()}
            </p>
            <p className="text-xs opacity-60 mt-1">{user?.name}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="relative z-10 mt-5 flex items-center gap-2 bg-white text-pink-600 font-bold text-sm px-5 py-2.5 rounded-2xl hover:bg-pink-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Top Up Wallet
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Total Deposited',
              value: transactions.filter(t => t.type === 'TOPUP' && t.status === 'SUCCESS').reduce((s, t) => s + t.amount, 0),
              color: 'text-green-600',
              bg: 'bg-green-50',
            },
            {
              label: 'Total Spent',
              value: transactions.filter(t => t.type === 'PAYMENT' && t.status === 'SUCCESS').reduce((s, t) => s + t.amount, 0),
              color: 'text-red-500',
              bg: 'bg-red-50',
            },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 border border-pink-100`}>
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`}>KSH {stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div>
          <h2 className="font-bold text-base mb-3">Transaction History</h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-pink-50 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-pink-100 rounded w-1/2" />
                    <div className="h-3 bg-pink-100 rounded w-1/3" />
                  </div>
                  <div className="h-4 bg-pink-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <Wallet className="w-12 h-12 text-pink-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-600">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">Top up your wallet to get started</p>
              <button onClick={() => setShowModal(true)}
                className="mt-4 bg-pink-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-pink-600 transition-colors">
                Top Up Now
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => {
                const cfg = TYPE_CONFIG[tx.type] ?? { label: tx.type, color: 'text-gray-600', bg: 'bg-gray-50', icon: 'in' };
                const isIn = cfg.icon === 'in';
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-2xl border border-pink-50 hover:border-pink-100 transition-colors">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      {isIn
                        ? <ArrowDownLeft className={`w-5 h-5 ${cfg.color}`} />
                        : <ArrowUpRight className={`w-5 h-5 ${cfg.color}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{tx.description || cfg.label}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${cfg.color}`}>
                        {isIn ? '+' : '-'}KSH {tx.amount.toLocaleString()}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[tx.status] || 'bg-gray-100 text-gray-600'}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}

              {page < totalPages && (
                <button onClick={() => loadTransactions(page + 1)}
                  className="w-full py-3 text-sm font-semibold text-pink-600 hover:bg-pink-50 rounded-2xl border border-pink-100 transition-colors mt-2">
                  Load More
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <WalletModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { load(); }}
      />
    </div>
  );
}
