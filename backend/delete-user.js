import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const email = 'wolfsilent906@gmail.com';
const user = await prisma.user.findUnique({ where: { email } });

if (!user) {
  console.log('❌ User not found:', email);
} else {
  await prisma.user.delete({ where: { email } });
  console.log('✅ Deleted user:', user.name, '(' + email + ')');
}

await prisma.$disconnect();