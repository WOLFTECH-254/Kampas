import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filePath = path.join(__dirname, 'src/components/WalletTopup.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the PaystackPop call — v2 needs `new PaystackPop()` first
content = content.replace(
  `      // 2. Open Paystack popup
      const handler = window.PaystackPop.newTransaction({
        key:          import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        accessCode:   access_code,
        onSuccess: async (transaction: any) => {`,
  `      // 2. Open Paystack popup (v2 API)
      const popup = new window.PaystackPop();
      popup.newTransaction({
        key:        import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        accessCode: access_code,
        onSuccess: async (transaction: any) => {`
);

// Also fix the closing of the handler (remove extra closing brace mismatch)
content = content.replace(
  `      });

    } catch (err: any) {`,
  `      });
    } catch (err: any) {`
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed: new PaystackPop().newTransaction()');
console.log('\nFrontend will hot-reload. Try the top-up again!');