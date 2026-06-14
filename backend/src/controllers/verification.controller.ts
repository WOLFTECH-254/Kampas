import type { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { createOTP, verifyOTP } from '../lib/otp.js';
import { sendPasswordResetEmail, sendWelcomeEmail, sendVerificationOTPEmail } from '../lib/email.js';
import type { AuthRequest } from '../middleware/auth.js';

// ── POST /api/auth/verify-email-otp ──────────────────────────────────────────
// OTP-based verification — user enters 6-digit code from their email
export const verifyEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email, code } = z.object({
      email: z.string().email(),
      code:  z.string().length(6),
    }).parse(req.body);

    const user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, name: true, email: true, isVerified: true },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.json({ success: true, message: 'Email already verified. You can log in.' });

    const result = await verifyOTP(user.id, code, 'EMAIL_VERIFICATION');
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type:   'SYSTEM',
        title:  '✅ Email Verified!',
        body:   'Your Kampas account is now verified.',
      },
    });

    sendWelcomeEmail(user.email, user.name).catch(err =>
      console.error('[email] Failed to send welcome email:', err?.response?.data || err.message)
    );

    return res.json({ success: true, message: 'Email verified! You can now log in.' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error('Verify email OTP error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/auth/resend-verification ───────────────────────────────────────
// Resends the OTP (rate limited — 1 minute cooldown, protected)
export const resendVerification = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { id: true, name: true, email: true, isVerified: true },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Email already verified' });

    const recent = await prisma.oTP.findFirst({
      where: {
        userId:    user.id,
        type:      'EMAIL_VERIFICATION',
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recent) {
      return res.status(429).json({ success: false, message: 'Please wait 1 minute before requesting another code' });
    }

    const otp = await createOTP(user.id, 'EMAIL_VERIFICATION');
    await sendVerificationOTPEmail(user.email, user.name, otp);

    return res.json({ success: true, message: `Verification code resent to ${user.email}` });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/auth/resend-verification-public ────────────────────────────────
// Public — resends OTP by email (no auth required)
export const resendVerificationPublic = async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, name: true, email: true, isVerified: true },
    });

    if (!user || user.isVerified) {
      return res.json({ success: true, message: 'If that email exists and is unverified, a new code has been sent.' });
    }

    const recent = await prisma.oTP.findFirst({
      where: {
        userId:    user.id,
        type:      'EMAIL_VERIFICATION',
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recent) {
      return res.status(429).json({ success: false, message: 'Please wait 1 minute before requesting another code' });
    }

    const otp = await createOTP(user.id, 'EMAIL_VERIFICATION');
    sendVerificationOTPEmail(user.email, user.name, otp).catch(err =>
      console.error('[email] Failed to resend verification OTP:', err?.response?.data || err.message)
    );

    return res.json({ success: true, message: 'Verification code resent.' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error('Resend verification public error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const generic = { success: true, message: 'If that email exists, a reset link has been sent.' };

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
    if (!user) return res.json(generic);

    const code = await createOTP(user.id, 'PASSWORD_RESET');
    const rawOrigin =
      process.env.APP_URL ||
      (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : '') ||
      (process.env.REPLIT_DOMAINS   ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : '');
    const appOrigin = rawOrigin.replace(/\/$/, '');
    const resetUrl = `${appOrigin}/reset-password?userId=${user.id}&code=${code}`;

    sendPasswordResetEmail(user.email, user.name, resetUrl).catch(err =>
      console.error('[email] Failed to send password reset email:', err?.response?.data || err.message)
    );

    return res.json(generic);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { userId, code, newPassword } = z.object({
      userId:      z.string(),
      code:        z.string().length(6),
      newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Invalid reset link.' });

    const result = await verifyOTP(userId, code, 'PASSWORD_RESET');
    if (!result.valid) return res.status(400).json({ success: false, message: result.message || 'Invalid or expired reset link.' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
