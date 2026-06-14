import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sendVerificationOTPEmail, sendPasswordResetEmail } from '../lib/email.js';
import { createOTP, verifyOTP } from '../lib/otp.js';
import { trackEvent } from '../lib/scoring.js';

const registerSchema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters'),
  email:        z.string().email('Invalid email address'),
  phone:        z.string().optional(),
  campus:       z.string().min(2, 'Campus is required'),
  password:     z.string().min(6, 'Password must be at least 6 characters'),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const onboardingSchema = z.object({
  role: z.enum(['BUYER', 'SELLER', 'BOTH']),
});

const generateToken = (user: { id: string; email: string; role: string }) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );

const safeSelect = {
  id: true, name: true, email: true, phone: true,
  campus: true, role: true, avatar: true, createdAt: true,
  walletBalance: true, sellerBalance: true, referralCode: true,
  isVerified: true, onboardingCompleted: true,
};

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getSettingValue(key: string, defaultValue: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? defaultValue;
}


// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    let referralCode: string;
    let attempts = 0;
    do {
      referralCode = generateReferralCode();
      attempts++;
    } while (
      await prisma.user.findUnique({ where: { referralCode } }) && attempts < 10
    );

    const referralEnabled = await getSettingValue('referral_enabled', 'false');
    let referrerId: string | undefined;

    if (referralEnabled === 'true' && data.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: data.referralCode.toUpperCase() },
      });
      if (referrer && referrer.email !== data.email) {
        referrerId = referrer.id;
      }
    }

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name:        data.name,
        email:       data.email,
        phone:       data.phone,
        campus:      data.campus,
        password:    hashed,
        role:        'BUYER',
        referralCode,
        referredById: referrerId,
      },
      select: safeSelect,
    });

    if (referrerId) {
      const rewardAmountStr = await getSettingValue('referral_reward_amount', '50');
      const rewardAmount = parseFloat(rewardAmountStr) || 50;

      const referrer = await prisma.user.update({
        where: { id: referrerId },
        data: { walletBalance: { increment: rewardAmount } },
      });

      await prisma.walletTransaction.create({
        data: {
          userId:      referrerId,
          type:        'REFERRAL_REWARD',
          amount:      rewardAmount,
          balance:     referrer.walletBalance,
          description: `Referral reward: ${user.name} joined using your code`,
          status:      'COMPLETED',
        },
      });

      await prisma.notification.create({
        data: {
          userId: referrerId,
          type:   'REFERRAL_REWARD',
          title:  '🎉 Referral Reward!',
          body:   `${user.name} joined Kampas using your referral code. KSH ${rewardAmount} added to your wallet!`,
        },
      });
    }

    // Send verification OTP — non-blocking
    createOTP(user.id, 'EMAIL_VERIFICATION').then(otp =>
      sendVerificationOTPEmail(user.email, user.name, otp).catch(err =>
        console.error('[email] Failed to send verification OTP:', err?.response?.data || err.message)
      )
    );

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({
      success: true,
      message: 'Account created! Enter the code sent to your email.',
      data: { user, token },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    }
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
      });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    const { password: _p, ...safe } = user;
    return res.status(200).json({ success: true, message: 'Login successful', data: { user: safe, token } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    }
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/auth/me  (protected)
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: safeSelect });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/auth/onboarding  (protected)
export const completeOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const { role } = onboardingSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data:  { role, onboardingCompleted: true },
      select: safeSelect,
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    return res.json({
      success: true,
      message: 'Onboarding complete!',
      data: { user, token },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    }
    console.error('Onboarding error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/auth/forgot-password  (public)
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond with success to prevent user enumeration
    const generic = { success: true, message: 'If an account with that email exists, a reset link has been sent.' };
    if (!user) return res.json(generic);

    const code = await createOTP(user.id, 'PASSWORD_RESET');
    const appOrigin = (process.env.APP_URL || '').replace(/\/$/, '');
    const resetUrl = `${appOrigin}/reset-password?userId=${user.id}&code=${code}`;

    sendPasswordResetEmail(user.email, user.name, resetUrl).catch(err =>
      console.error('[email] Failed to send password reset email:', err?.response?.data || err.message)
    );
    return res.json(generic);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    console.error('ForgotPassword error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/auth/reset-password  (public)
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { userId, code, newPassword } = z.object({
      userId:      z.string().min(1),
      code:        z.string().length(6),
      newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    }).parse(req.body);

    const result = await verifyOTP(userId, code, 'PASSWORD_RESET');
    if (!result.valid) return res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: (err as z.ZodError).errors });
    console.error('ResetPassword error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const surveySchema = z.object({
  interestedCats: z.array(z.string()).optional(),
  likelyServices: z.array(z.string()).optional(),
  budgetRange:    z.string().optional(),
  shopFrequency:  z.string().optional(),
  lookingFor:     z.array(z.string()).optional(),
});

// POST /api/auth/survey  (protected)
export const completeSurvey = async (req: AuthRequest, res: Response) => {
  try {
    const data = surveySchema.parse(req.body);

    await prisma.userPreferences.upsert({
      where:  { userId: req.user!.id },
      update: {
        interestedCats:  data.interestedCats ? JSON.stringify(data.interestedCats) : undefined,
        likelyServices:  data.likelyServices ? JSON.stringify(data.likelyServices) : undefined,
        budgetRange:     data.budgetRange,
        shopFrequency:   data.shopFrequency,
        lookingFor:      data.lookingFor ? JSON.stringify(data.lookingFor) : undefined,
        surveyCompleted: true,
        updatedAt:       new Date(),
      },
      create: {
        userId:          req.user!.id,
        interestedCats:  data.interestedCats ? JSON.stringify(data.interestedCats) : null,
        likelyServices:  data.likelyServices ? JSON.stringify(data.likelyServices) : null,
        budgetRange:     data.budgetRange ?? null,
        shopFrequency:   data.shopFrequency ?? null,
        lookingFor:      data.lookingFor ? JSON.stringify(data.lookingFor) : null,
        surveyCompleted: true,
        updatedAt:       new Date(),
      },
    });

    if (data.interestedCats?.length) {
      await Promise.all(
        data.interestedCats.map(slug =>
          trackEvent(req.user!.id, 'SURVEY_CATEGORY', { categorySlug: slug })
        )
      );
    }

    return res.json({ success: true, message: 'Survey saved!' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    }
    console.error('Survey error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
