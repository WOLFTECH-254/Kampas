import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Search, MessageCircle, Wallet, ShoppingCart, Store, ShieldCheck, HelpCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const SECTIONS = [
  {
    icon: ShoppingCart,
    title: 'Buying on Kampas',
    color: 'text-pink-500',
    bg: 'bg-pink-50',
    faqs: [
      { q: 'How do I buy a product?', a: 'Browse or search for a product on the Explore page. Click it to see full details. Add it to your cart, then go to your Buyer Dashboard to complete checkout using your Kampas Wallet.' },
      { q: 'How do I pay?', a: 'Kampas uses an internal wallet. You top up your wallet via M-Pesa STK Push or card (Paystack), then use the balance to pay for orders. This keeps payments fast and secure.' },
      { q: 'Can I buy from any campus?', a: 'Yes. The "Nearby" filter on Explore helps you find products from sellers on your campus or school, but you can browse and buy from any campus.' },
      { q: 'What if I receive a wrong or damaged item?', a: 'Raise a dispute from your order history in the Buyer Dashboard within 48 hours of delivery. Our team reviews disputes and can issue a refund to your wallet.' },
      { q: 'How do I track my order?', a: 'Go to Buyer Dashboard → My Orders to see the status of each order (Pending, Confirmed, Processing, Shipped, Delivered).' },
    ],
  },
  {
    icon: Store,
    title: 'Selling on Kampas',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    faqs: [
      { q: 'How do I become a seller?', a: 'Go to your Profile and switch your role to Seller. You\'ll be guided through setting up your store — name, description, campus, and M-Pesa number for payouts.' },
      { q: 'How do I list a product?', a: 'From your Seller Dashboard, click "Add Product". Fill in the title, price, condition, category, and upload clear photos. Your listing goes live immediately.' },
      { q: 'When do I get paid?', a: 'Earnings go into your Kampas Seller Wallet when an order is marked Delivered. You can withdraw to your M-Pesa number from the Seller Dashboard.' },
      { q: 'What fees does Kampas charge?', a: 'Kampas charges a small platform commission (currently 5%) on each completed sale. There are no listing fees.' },
      { q: 'Can I sell services?', a: 'Yes — select the "Services" or "Gigs & Hustles" category. Describe your service clearly and set a price. Buyers can contact you via chat.' },
    ],
  },
  {
    icon: Wallet,
    title: 'Wallet & Payments',
    color: 'text-green-600',
    bg: 'bg-green-50',
    faqs: [
      { q: 'How do I top up my wallet?', a: 'Go to your Wallet page or Buyer Dashboard and tap "Top Up". Choose M-Pesa (STK Push sent to your phone) or card. Funds reflect instantly once payment is confirmed.' },
      { q: 'Is my M-Pesa number safe?', a: 'Yes. We use Paystack for all payment processing. Your M-Pesa number is only used to initiate the STK push and is never stored on Kampas servers.' },
      { q: 'How long do refunds take?', a: 'Approved refunds are credited to your Kampas Wallet within 3–5 business days. Wallet-to-M-Pesa withdrawals take 1–2 business days.' },
      { q: 'Is there a minimum top-up amount?', a: 'The minimum top-up is KSH 50.' },
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Trust & Safety',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    faqs: [
      { q: 'How does Kampas verify sellers?', a: 'Sellers can submit KYC documents (student ID, national ID) for a "Verified" badge. Verified sellers appear more prominently in search results.' },
      { q: 'How do I report a suspicious listing?', a: 'On any product page, tap the three-dot menu and select "Report". Our moderation team reviews reports within 24 hours.' },
      { q: 'What if someone scams me?', a: 'Do not send money outside the platform. All Kampas orders are covered by buyer protection. If you believe you\'ve been scammed, contact support@kampas.co.ke immediately.' },
      { q: 'How do I block a user?', a: 'In a chat, tap the seller\'s name to open their profile and select "Block". Blocked users cannot message you or see your listings.' },
    ],
  },
  {
    icon: MessageCircle,
    title: 'Account & Chat',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    faqs: [
      { q: 'How do I reset my password?', a: 'Go to the Login page and tap "Forgot Password". Enter your email and you\'ll receive a reset link within a few minutes.' },
      { q: 'Can I have both a buyer and seller account?', a: 'Yes. You can switch your role to "Both" from Profile → Settings, which gives you access to both the Buyer and Seller dashboards.' },
      { q: 'How does chat work?', a: 'Tap "Chat with Seller" on any product detail page to start a conversation. Chats are real-time via our messaging system. Never share sensitive financial details in chat.' },
      { q: 'How do I delete my account?', a: 'Go to Profile → Settings → Account → Delete Account. This is permanent and cannot be undone. Your wallet balance must be zero before deletion.' },
    ],
  },
];

export default function Docs() {
  const navigate = useNavigate();
  const [search, setSearch]     = useState('');
  const [openIdx, setOpenIdx]   = useState<string | null>(null);

  const filtered = SECTIONS.map(s => ({
    ...s,
    faqs: s.faqs.filter(f =>
      !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => s.faqs.length > 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-pink-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-pink-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg flex-1">Help Centre</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-7 h-7 text-pink-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How can we help?</h2>
          <p className="text-gray-500 text-sm">Find answers about buying, selling, payments, and more.</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-pink-50 border border-pink-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>

        {/* Sections */}
        {filtered.map(section => (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 ${section.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <section.icon className={`w-4 h-4 ${section.color}`} />
              </div>
              <h3 className="font-bold text-gray-900">{section.title}</h3>
            </div>
            <div className="space-y-2">
              {section.faqs.map((faq, i) => {
                const key = `${section.title}-${i}`;
                const open = openIdx === key;
                return (
                  <div key={key} className="border border-pink-100 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setOpenIdx(open ? null : key)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-pink-50 transition-colors"
                    >
                      <span className="font-semibold text-sm text-gray-800">{faq.q}</span>
                      {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>
                    {open && (
                      <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-pink-50 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-pink-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">No results for "{search}"</p>
            <p className="text-sm text-gray-400 mt-1">Try different keywords or contact us directly</p>
          </div>
        )}

        {/* Contact CTA */}
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 text-center">
          <p className="font-bold text-gray-900 mb-1">Still need help?</p>
          <p className="text-sm text-gray-500 mb-4">Our support team is available Mon–Fri, 8am–6pm EAT.</p>
          <a href="mailto:support@kampas.co.ke"
            className="inline-block bg-pink-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-pink-600 transition-colors">
            Email Support
          </a>
        </div>
      </div>

      <footer className="border-t border-pink-100 px-5 py-6 text-center text-xs text-gray-400">
        <div className="flex justify-center gap-6 mb-2">
          <Link to="/privacy" className="hover:text-pink-500 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-pink-500 transition-colors">Terms of Service</Link>
          <Link to="/docs" className="hover:text-pink-500 transition-colors">Help Centre</Link>
        </div>
        © 2026 Kampas. Made in Nairobi.
      </footer>
    </div>
  );
}
