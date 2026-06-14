import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const B = path.join(__dirname, 'backend');

const schemaPath = path.join(B, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Add ads relation to Product model if missing
if (!schema.includes('ads           Ad[]')) {
  schema = schema.replace(
    '  activityLogs  ActivityLog[]',
    '  activityLogs  ActivityLog[]\n  ads           Ad[]'
  );
  fs.writeFileSync(schemaPath, schema);
  console.log('✅ Added ads relation to Product model');
} else {
  console.log('⏭️  Already exists');
}

console.log('\n🗄️  Running migration...\n');
execSync('npx prisma migrate dev --name seller_backend', { stdio: 'inherit', cwd: B });
execSync('npx prisma generate', { stdio: 'inherit', cwd: B });
console.log('\n✅ Done! Restart backend: cd backend && npm run dev');