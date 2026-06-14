import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email  = '777wolftech@gmail.com';

const user = await prisma.user.update({
  where: { email },
  data:  { role: 'ADMIN' },
});

console.log(`✅ ${user.name} is now an ADMIN`);
await prisma.$disconnect();