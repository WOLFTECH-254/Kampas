import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const B = path.join(__dirname, 'backend');

const write = (filePath, content) => {
  fs.writeFileSync(path.join(__dirname, filePath), content, 'utf8');
  console.log(`  📄 ${filePath}`);
};
const writeB = (filePath, content) => {
  fs.writeFileSync(path.join(B, filePath), content, 'utf8');
  console.log(`  📄 backend/${filePath}`);
};

console.log('\n=============================================');
console.log('  📱 Fixing M-Pesa STK Push + Card Popup');
console.log('=============================================\n');

// ── 1. Backend — split into two endpoints ─────────────────────────────────────
// /topup/mpesa  → direct STK push (07 format)
// /topup/card   → Paystack initialize (popup)
// /topup/verify → verify both

const filePath = path.join(B, 'src/controllers/payment.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the initiateMpesaTopup with two clean functions
const newFunctions = `
// ── POST /api/buyer/wallet/topup/mpesa ───────────────────────────────────────
// Direct M-Pesa STK push — no popup, our own UI
export const initiateMpesaTopup = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, phone } = z.object({
      amount: z.number().min(10, 'Minimum is KSH 10'),
      phone:  z.string().min(10, 'Enter a valid phone number'),
    }).parse(req.body);

    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { email: true, name: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Keep 07XXXXXXXXX format — strip spaces/dashes only
    let normalizedPhone = phone.replace(/[\\s\\-\\(\\)]/g, '');
    // Ensure it starts with 07 or 01
    if (normalizedPhone.startsWith('+254')) normalizedPhone = '0' + normalizedPhone.slice(4);
    else if (normalizedPhone.startsWith('254')) normalizedPhone = '0' + normalizedPhone.slice(3);
    if (!/^0[17]\\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid Kenyan number e.g. 0712345678' });
    }

    console.log('STK Push → phone:', normalizedPhone, 'amount:', amount);

    const paystackRes = await axios.post(
      \`\${PAYSTACK_BASE}/charge\`,
      {
        amount:       Math.round(amount * 100),
        email:        user.email,
        currency:     'KES',
        mobile_money: { phone: normalizedPhone, provider: 'mpesa' },
        metadata:     { userId: req.user!.id, type: 'WALLET_TOPUP', amount },
      },
      { headers: paystackHeaders() }
    );

    const charge = paystackRes.data.data;
    console.log('Paystack STK response:', JSON.stringify(charge, null, 2));

    await prisma.walletTransaction.create({
      data: {
        userId:      req.user!.id,
        type:        'TOPUP',
        amount:      0,
        balance:     0,
        reference:   charge.reference,
        description: \`M-Pesa top-up of KSH \${amount} from \${normalizedPhone}\`,
        status:      'PENDING',
      },
    });

    return res.json({
      success: true,
      message: 'STK push sent! Enter your M-Pesa PIN on your phone.',
      data:    { reference: charge.reference, status: charge.status },
    });
  } catch (err: any) {
    console.error('STK Push error:', err?.response?.data || err.message);
    const msg = err?.response?.data?.message || err.message || 'Failed to send STK push';
    return res.status(500).json({ success: false, message: msg });
  }
};

// ── POST /api/buyer/wallet/topup/card ────────────────────────────────────────
// Initialize Paystack transaction for card popup
export const initiateCardTopup = async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = z.object({ amount: z.number().min(10) }).parse(req.body);

    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { email: true, name: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const paystackRes = await axios.post(
      \`\${PAYSTACK_BASE}/transaction/initialize\`,
      {
        email:        user.email,
        amount:       Math.round(amount * 100),
        currency:     'KES',
        channels:     ['card'], // card only
        callback_url: \`\${process.env.APP_URL || 'http://localhost:3000'}/payment/callback\`,
        metadata:     { userId: req.user!.id, type: 'WALLET_TOPUP', amount },
      },
      { headers: paystackHeaders() }
    );

    const { access_code, reference } = paystackRes.data.data;

    await prisma.walletTransaction.create({
      data: {
        userId:      req.user!.id,
        type:        'TOPUP',
        amount:      0,
        balance:     0,
        reference,
        description: \`Card top-up of KSH \${amount}\`,
        status:      'PENDING',
      },
    });

    return res.json({
      success: true,
      message: 'Card payment initialized',
      data:    { access_code, reference, amount },
    });
  } catch (err: any) {
    console.error('Card topup error:', err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: err?.response?.data?.message || 'Failed to initialize card payment' });
  }
};
`;

// Find and replace the old initiateMpesaTopup block
const startMarker = '// ── POST /api/buyer/wallet/topup/initialize';
const endMarker   = '\n};\n\n// ── POST /api/buyer/wallet/topup/verify';
const start = content.indexOf(startMarker);
const end   = content.indexOf(endMarker) + 3;

if (start !== -1 && end > start) {
  content = content.slice(0, start) + newFunctions + '\n' + content.slice(end);
} else {
  // fallback — append
  content += '\n' + newFunctions;
}

fs.writeFileSync(filePath, content);
console.log('  📄 backend/src/controllers/payment.controller.ts');

// ── 2. Add card route to buyer.routes.ts ─────────────────────────────────────
const routesPath = path.join(B, 'src/routes/buyer.routes.ts');
let routes = fs.readFileSync(routesPath, 'utf8');

if (!routes.includes('initiateCardTopup')) {
  routes = routes.replace(
    `import { initiateMpesaTopup, verifyMpesaTopup, getTransactions } from '../controllers/payment.controller.js';`,
    `import { initiateMpesaTopup, initiateCardTopup, verifyMpesaTopup, getTransactions } from '../controllers/payment.controller.js';`
  );
  routes = routes.replace(
    `r.post('/wallet/topup/mpesa', initiateMpesaTopup);  // real M-Pesa STK`,
    `r.post('/wallet/topup/mpesa', initiateMpesaTopup);  // M-Pesa STK push
r.post('/wallet/topup/card',  initiateCardTopup);    // Card via Paystack popup`
  );
  fs.writeFileSync(routesPath, routes);
  console.log('  📄 backend/src/routes/buyer.routes.ts');
}

// ── 3. Updated WalletTopup — M-Pesa has phone input, Card uses popup ──────────
write('src/components/WalletTopup.tsx', `
import { useState, useEffect, useRef } from 'react';
import { CreditCard, Smartphone, Wallet, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, Phone } from 'lucide-react';
import { POST } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Props {
  onSuccess?: (newBalance: number) => void;
}

type Step   = 'form' | 'stk_pending' | 'processing' | 'success' | 'failed';
type Method = 'mpesa' | 'card' | null;

declare global { interface Window { PaystackPop: any; } }

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];
const MAX_POLLS     = 20;

export default function WalletTopup({ onSuccess }: Props) {
  const { user, refresh } = useAuth();

  const [amount,     setAmount]     = useState('');
  const [phone,      setPhone]      = useState(user?.phone || '');
  const [method,     setMethod]     = useState<Method>(null);
  const [step,       setStep]       = useState<Step>('form');
  const [message,    setMessage]    = useState('');
  const [newBalance, setNewBalance] = useState(0);
  const [reference,  setReference]  = useState('');
  const [error,      setError]      = useState('');
  const [pollCount,  setPollCount]  = useState(0);
  const [countdown,  setCountdown]  = useState(60);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const amt = parseFloat(amount) || 0;

  // Countdown timer for STK pending screen
  useEffect(() => {
    if (step === 'stk_pending') {
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown(prev => prev <= 1 ? (clearInterval(timerRef.current!), 0) : prev - 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  // Poll Paystack for STK confirmation
  useEffect(() => {
    if (step === 'stk_pending' && reference) {
      pollRef.current = setInterval(pollPayment, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, reference]);

  const pollPayment = async () => {
    setPollCount(prev => {
      if (prev >= MAX_POLLS) {
        clearInterval(pollRef.current!);
        setStep('failed');
        setMessage('Payment timed out. If you completed payment, contact support.');
        return prev;
      }
      return prev + 1;
    });
    try {
      const res = await POST('/api/buyer/wallet/topup/verify', { reference });
      if (res.data?.status === 'success') {
        clearInterval(pollRef.current!);
        setNewBalance(res.data.balance);
        setMessage(res.message || \`KSH \${amt.toLocaleString()} added!\`);
        setStep('success');
        await refresh();
        onSuccess?.(res.data.balance);
      } else if (res.data?.status === 'failed' || res.data?.status === 'abandoned') {
        clearInterval(pollRef.current!);
        setStep('failed');
        setMessage(res.message || 'Payment failed. Please try again.');
      }
    } catch {}
  };

  const reset = () => {
    clearInterval(pollRef.current!);
    clearInterval(timerRef.current!);
    setStep('form');
    setMethod(null);
    setAmount('');
    setMessage('');
    setReference('');
    setError('');
    setPollCount(0);
  };

  const handleMpesa = async () => {
    setError('');
    if (amt < 10)        { setError('Minimum top-up is KSH 10'); return; }
    if (!phone)          { setError('Enter your M-Pesa phone number'); return; }
    if (phone.length < 10) { setError('Enter a valid phone number e.g. 0712345678'); return; }

    setStep('processing');
    try {
      const res = await POST('/api/buyer/wallet/topup/mpesa', { amount: amt, phone });
      setReference(res.data.reference);
      setStep('stk_pending');
    } catch (err: any) {
      setStep('failed');
      setMessage(err.message || 'Failed to send STK push. Try again.');
    }
  };

  const handleCard = async () => {
    setError('');
    if (amt < 10) { setError('Minimum top-up is KSH 10'); return; }
    setStep('processing');
    try {
      const res = await POST('/api/buyer/wallet/topup/card', { amount: amt });
      const { access_code, reference: ref } = res.data;
      setReference(ref);

      const popup = new window.PaystackPop();
      popup.newTransaction({
        key:        import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        accessCode: access_code,
        onSuccess: async (transaction: any) => {
          setStep('processing');
          try {
            const verifyRes = await POST('/api/buyer/wallet/topup/verify', { reference: transaction?.reference || ref });
            if (verifyRes.data?.status === 'success') {
              setNewBalance(verifyRes.data.balance);
              setMessage(verifyRes.message || \`KSH \${amt.toLocaleString()} added!\`);
              setStep('success');
              await refresh();
              onSuccess?.(verifyRes.data.balance);
            } else {
              setMessage('Payment received! Balance updating...');
              setStep('success');
              setTimeout(refresh, 2000);
            }
          } catch {
            setMessage('Payment received! Your balance will update shortly.');
            setStep('success');
            setTimeout(refresh, 3000);
          }
        },
        onCancel: () => {
          setStep('form');
          setError('Card payment cancelled.');
        },
      });
    } catch (err: any) {
      setStep('failed');
      setMessage(err.message || 'Failed to initialize card payment.');
    }
  };

  return (
    <div className="space-y-5">

      {/* ── FORM ─────────────────────────────────────────────────────── */}
      {step === 'form' && (
        <>
          {/* Balance */}
          <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-white border border-pink-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wallet className="w-4 h-4 text-pink-500" /> Current Balance
            </div>
            <span className="font-bold text-lg">KSH {(user?.walletBalance ?? 0).toLocaleString()}</span>
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Amount</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {QUICK_AMOUNTS.map(a => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className={\`py-2.5 rounded-xl text-sm font-bold border transition-all \${
                    amount === String(a) ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white border-pink-200 text-gray-700 hover:border-pink-400'
                  }\`}>
                  {a.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">KSH</span>
              <input type="number" value={amount} min="10"
                onChange={e => setAmount(e.target.value)} placeholder="Enter amount"
                className="w-full bg-white border border-pink-200 rounded-xl py-3 pl-14 pr-4 text-sm font-bold focus:outline-none focus:border-pink-500" />
            </div>
          </div>

          {/* Payment method tabs */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pay With</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMethod('mpesa')}
                className={\`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all \${
                  method === 'mpesa' ? 'border-green-500 bg-green-50' : 'border-pink-200 bg-white hover:border-green-300'
                }\`}>
                <div className={\`w-10 h-10 rounded-xl flex items-center justify-center \${method === 'mpesa' ? 'bg-green-500' : 'bg-green-100'}\`}>
                  <Smartphone className={\`w-5 h-5 \${method === 'mpesa' ? 'text-white' : 'text-green-600'}\`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">M-Pesa</p>
                  <p className="text-[10px] text-gray-400">STK Push</p>
                </div>
                {method === 'mpesa' && <CheckCircle className="w-4 h-4 text-green-500" />}
              </button>

              <button onClick={() => setMethod('card')}
                className={\`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all \${
                  method === 'card' ? 'border-pink-500 bg-pink-50' : 'border-pink-200 bg-white hover:border-pink-300'
                }\`}>
                <div className={\`w-10 h-10 rounded-xl flex items-center justify-center \${method === 'card' ? 'bg-pink-500' : 'bg-pink-100'}\`}>
                  <CreditCard className={\`w-5 h-5 \${method === 'card' ? 'text-white' : 'text-pink-600'}\`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">Card</p>
                  <p className="text-[10px] text-gray-400">Visa / Mastercard</p>
                </div>
                {method === 'card' && <CheckCircle className="w-4 h-4 text-pink-500" />}
              </button>
            </div>
          </div>

          {/* M-Pesa phone input — shows when M-Pesa selected */}
          {method === 'mpesa' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">M-Pesa Number</p>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  maxLength={12}
                  className="w-full bg-white border border-green-300 rounded-xl py-3 pl-9 pr-4 text-sm font-semibold focus:outline-none focus:border-green-500 transition-colors placeholder:font-normal"
                />
              </div>
              <p className="text-xs text-green-700">You will receive an STK push on this number. Enter your PIN to confirm.</p>
            </div>
          )}

          {/* Summary */}
          {amt >= 10 && method && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Amount</span>
                <span className="font-semibold text-gray-900">KSH {amt.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Via</span>
                <span className="font-semibold text-gray-900">{method === 'mpesa' ? '📱 M-Pesa' : '💳 Card'}</span>
              </div>
              {method === 'mpesa' && phone && (
                <div className="flex justify-between text-gray-500">
                  <span>Phone</span>
                  <span className="font-semibold text-gray-900">{phone}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1.5">
                <span className="text-gray-500">New Balance</span>
                <span className="font-bold text-pink-600">KSH {((user?.walletBalance ?? 0) + amt).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={method === 'mpesa' ? handleMpesa : handleCard}
            disabled={!amt || amt < 10 || !method || (method === 'mpesa' && !phone)}
            className={\`w-full font-bold py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed \${
              method === 'mpesa' ? 'bg-green-500 hover:bg-green-600 text-white'
            : method === 'card'  ? 'bg-pink-500 hover:bg-pink-600 text-white'
            : 'bg-gray-200 text-gray-400'
            }\`}>
            {method === 'mpesa' && <><Smartphone className="w-4 h-4" /> Pay KSH {amt.toLocaleString()} via M-Pesa</>}
            {method === 'card'  && <><CreditCard  className="w-4 h-4" /> Pay KSH {amt.toLocaleString()} via Card</>}
            {!method            && <><Wallet className="w-4 h-4" /> Select amount & payment method</>}
          </button>
          <p className="text-[11px] text-center text-gray-400">🔒 Secured by Paystack · PCI DSS Compliant</p>
        </>
      )}

      {/* ── STK PENDING ───────────────────────────────────────────────── */}
      {step === 'stk_pending' && (
        <div className="text-center py-8 space-y-5">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
              <Smartphone className="w-9 h-9 text-green-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
          <div>
            <p className="font-bold text-xl text-gray-900">Check your phone!</p>
            <p className="text-gray-500 text-sm mt-1">STK push sent to <strong className="text-green-600">{phone}</strong></p>
            <p className="text-gray-400 text-xs mt-1">Enter your M-Pesa PIN to complete payment.</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2 text-sm text-left">
            <div className="flex justify-between text-gray-600"><span>Amount</span><span className="font-bold">KSH {amt.toLocaleString()}</span></div>
            <div className="flex justify-between text-gray-600"><span>Phone</span><span className="font-bold">{phone}</span></div>
            <div className="flex justify-between text-gray-600"><span>Reference</span><span className="font-mono text-xs">{reference}</span></div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Waiting for confirmation... ({countdown}s)
          </div>
          <p className="text-xs text-gray-400">Didn't receive it?</p>
          <button onClick={reset} className="text-sm text-pink-500 hover:text-pink-700 underline">Cancel & try again</button>
        </div>
      )}

      {/* ── PROCESSING ────────────────────────────────────────────────── */}
      {step === 'processing' && (
        <div className="text-center py-10 space-y-4">
          <div className="w-16 h-16 bg-pink-50 border-2 border-pink-200 rounded-full flex items-center justify-center mx-auto">
            <RefreshCw className="w-7 h-7 text-pink-500 animate-spin" />
          </div>
          <p className="font-bold text-gray-900">Sending STK push...</p>
          <p className="text-gray-400 text-sm">Please wait a moment.</p>
        </div>
      )}

      {/* ── SUCCESS ───────────────────────────────────────────────────── */}
      {step === 'success' && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <p className="font-bold text-xl text-gray-900">Payment Confirmed! 🎉</p>
            <p className="text-gray-500 text-sm mt-1">{message}</p>
          </div>
          {newBalance > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">New Wallet Balance</p>
              <p className="text-3xl font-bold text-green-600 mt-1">KSH {newBalance.toLocaleString()}</p>
            </div>
          )}
          <button onClick={reset} className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors text-sm">
            Top Up Again
          </button>
        </div>
      )}

      {/* ── FAILED ────────────────────────────────────────────────────── */}
      {step === 'failed' && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">Payment Failed</p>
            <p className="text-gray-500 text-sm mt-1">{message}</p>
          </div>
          <button onClick={reset} className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}
`);

console.log('\n=============================================');
console.log('  ✅ M-Pesa STK + Card Payment ready!');
console.log('');
console.log('  M-Pesa flow:');
console.log('  - User picks M-Pesa → phone input appears');
console.log('  - Enter 07XXXXXXXXX → click Pay');
console.log('  - STK push sent → countdown shown');
console.log('  - Enter PIN → auto-detected & wallet credited');
console.log('');
console.log('  Card flow:');
console.log('  - User picks Card → click Pay');
console.log('  - Paystack popup opens');
console.log('  - Complete payment → wallet credited');
console.log('=============================================\n');