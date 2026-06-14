
import { prisma } from './prisma.js';

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const createOTP = async (userId: string, type: string) => {
  // Invalidate any previous unused OTPs of the same type
  await prisma.oTP.updateMany({
    where: { userId, type, used: false },
    data:  { used: true },
  });

  const code      = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.oTP.create({ data: { userId, code, type, expiresAt } });
  return code;
};

export const verifyOTP = async (userId: string, code: string, type: string) => {
  const otp = await prisma.oTP.findFirst({
    where: { userId, code, type, used: false, expiresAt: { gte: new Date() } },
  });

  if (!otp) return { valid: false, message: 'Invalid or expired OTP' };

  await prisma.oTP.update({ where: { id: otp.id }, data: { used: true } });
  return { valid: true };
};
