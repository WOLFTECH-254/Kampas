import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-pink-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-pink-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg">Terms of Service</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 prose prose-sm text-gray-700">
        <p className="text-xs text-gray-400 mb-8">Last updated: June 2026</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">1. Acceptance of Terms</h2>
        <p>By accessing or using Kampas ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform. Kampas is a peer-to-peer campus marketplace for Kenyan university, KMTC, and TVET students.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">2. Eligibility</h2>
        <p>You must be at least 16 years old and a registered student or campus community member to create an account. By registering, you confirm that the information you provide is accurate and up to date.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">3. User Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately at <a href="mailto:support@kampas.co.ke" className="text-pink-600">support@kampas.co.ke</a> of any unauthorised use of your account. Kampas is not liable for any loss resulting from unauthorised access.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">4. Buying & Selling</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sellers must accurately describe products including condition, price, and campus location.</li>
          <li>Buyers are responsible for verifying product details before purchasing.</li>
          <li>Kampas facilitates transactions but is not a party to any sale between buyers and sellers.</li>
          <li>Products that are illegal, counterfeit, or violate third-party rights are strictly prohibited.</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">5. Payments & Wallet</h2>
        <p>The Kampas Wallet is used to hold funds for purchases. Top-ups are processed via M-Pesa (Paystack) or card. Kampas does not store card details. Refunds for cancelled or disputed orders are returned to your wallet within 3–5 business days.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">6. Prohibited Conduct</h2>
        <p>You may not use Kampas to: harass other users, post fraudulent listings, manipulate reviews, spam, scrape data, or circumvent any security features of the Platform.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">7. Intellectual Property</h2>
        <p>All content, branding, and technology on Kampas is owned by Kampas or its licensors. You may not reproduce or distribute any part of the Platform without written permission.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">8. Limitation of Liability</h2>
        <p>Kampas provides the Platform on an "as is" basis. We are not liable for any indirect, incidental, or consequential damages arising from use of the Platform, including disputes between buyers and sellers.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">9. Termination</h2>
        <p>We reserve the right to suspend or terminate your account if you violate these Terms. You may delete your account at any time from your profile settings.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">10. Changes to Terms</h2>
        <p>Kampas may update these Terms from time to time. Continued use of the Platform after changes constitutes acceptance of the new Terms.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">11. Contact</h2>
        <p>For questions about these Terms, email <a href="mailto:legal@kampas.co.ke" className="text-pink-600">legal@kampas.co.ke</a> or visit <Link to="/docs" className="text-pink-600">our Help Centre</Link>.</p>
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
