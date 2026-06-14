import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-pink-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-pink-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg">Privacy Policy</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 text-gray-700">
        <p className="text-xs text-gray-400 mb-8">Last updated: June 2026</p>

        <p className="mb-6">Kampas ("we", "our", "us") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">1. Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><strong>Account data:</strong> name, email address, phone number, campus/school.</li>
          <li><strong>Profile data:</strong> avatar, bio, verification documents (KYC).</li>
          <li><strong>Transaction data:</strong> wallet top-ups, purchases, order history.</li>
          <li><strong>Usage data:</strong> pages visited, products viewed, search queries — used to power recommendations.</li>
          <li><strong>Device data:</strong> IP address, browser type, operating system.</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">2. How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>To provide, maintain, and improve the Kampas platform.</li>
          <li>To personalise your experience (e.g., "For You" product recommendations).</li>
          <li>To process payments and send transaction confirmations.</li>
          <li>To send important notices (security alerts, order updates) via email or SMS.</li>
          <li>To detect and prevent fraud, abuse, or policy violations.</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">3. Sharing of Information</h2>
        <p className="text-sm mb-3">We do not sell your personal data. We share information only:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>With other users as required for marketplace functionality (e.g., a buyer sees a seller's name and campus).</li>
          <li>With payment processors (Paystack, Brevo) who are bound by their own privacy policies.</li>
          <li>Where required by Kenyan law or valid legal process.</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">4. Data Storage & Security</h2>
        <p className="text-sm">Your data is stored on secure servers. We use industry-standard encryption (TLS/HTTPS) for data in transit. Passwords are hashed using bcrypt and never stored in plain text. We conduct regular security audits.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">5. Cookies & Tracking</h2>
        <p className="text-sm">Kampas uses localStorage to store your authentication token. We do not use third-party advertising cookies. Usage analytics are collected internally to improve the platform.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">6. Your Rights</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
          <li><strong>Correction:</strong> Update inaccurate information from your profile settings.</li>
          <li><strong>Deletion:</strong> Request account deletion — we will remove your personal data within 30 days.</li>
          <li><strong>Portability:</strong> Request an export of your data in a machine-readable format.</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">7. Children's Privacy</h2>
        <p className="text-sm">Kampas is not directed at children under 16. We do not knowingly collect data from anyone under 16. If you believe a minor has registered, contact us immediately.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">8. Changes to This Policy</h2>
        <p className="text-sm">We may update this policy from time to time. We will notify registered users via email of material changes. Your continued use of Kampas after updates constitutes acceptance.</p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">9. Contact Us</h2>
        <p className="text-sm">For privacy-related requests or questions: <a href="mailto:privacy@kampas.co.ke" className="text-pink-600">privacy@kampas.co.ke</a></p>
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
