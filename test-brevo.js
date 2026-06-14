import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const apiKey      = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL;
const senderName  = process.env.BREVO_SENDER_NAME  || process.env.BREVO_FROM_NAME || 'Kampas';

console.log('\n🔍 Brevo Config:');
console.log('  API Key:      ', apiKey ? apiKey.slice(0, 20) + '...' : '❌ NOT SET');
console.log('  Sender Email: ', senderEmail || '❌ NOT SET');
console.log('  Sender Name:  ', senderName);

if (!apiKey || !senderEmail) {
  console.log('\n❌ Missing credentials. Check backend/.env');
  process.exit(1);
}

console.log('\n📧 Sending test email...');

try {
  const res = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender:      { name: senderName, email: senderEmail },
      to:          [{ email: 'korirbriton25@students.tukenya.ac.ke' }],
      subject:     'Kampas Test Email',
      htmlContent: '<h1>Test email from Kampas 🎉</h1><p>If you see this, Brevo is working!</p>',
    },
    {
      headers: {
        'api-key':      apiKey,
        'Content-Type': 'application/json',
      },
    }
  );
  console.log('\n✅ Email sent successfully!');
  console.log('   Message ID:', res.data.messageId);
} catch (err) {
  console.log('\n❌ Brevo API Error:');
  console.log('   Status:', err.response?.status);
  console.log('   Message:', err.response?.data?.message);
  console.log('   Code:', err.response?.data?.code);
  console.log('   Full response:', JSON.stringify(err.response?.data, null, 2));
}