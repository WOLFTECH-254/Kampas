
import type { Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const updateProfileSchema = z.object({
  name:   z.string().min(2).optional(),
  phone:  z.string().optional(),
  campus: z.string().optional(),
  avatar: z.string().optional(),   // allows URL or base64 data URL
});

const roleUpgradeSchema = z.object({
  role: z.enum(['SELLER', 'BOTH']),
});

const topupSchema = z.object({
  amount:    z.number().positive('Amount must be positive'),
  reference: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  phone:  z.string().min(10, 'Valid phone required'),
});

const safeSelect = {
  id: true, name: true, email: true, phone: true,
  campus: true, role: true, avatar: true, walletBalance: true,
  isVerified: true, createdAt: true,
};

// GET /api/buyer/profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: safeSelect });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: { user } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/buyer/profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: safeSelect,
    });
    return res.json({ success: true, message: 'Profile updated', data: { user } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/buyer/role — upgrade BUYER→SELLER or BOTH (requires email verification)
export const changeRole = async (req: AuthRequest, res: Response) => {
  try {
    const { role } = roleUpgradeSchema.parse(req.body);
    const current = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { ...safeSelect, isVerified: true },
    });
    if (!current) return res.status(404).json({ success: false, message: 'User not found' });
    if (!current.isVerified)
      return res.status(403).json({ success: false, message: 'Please verify your email before changing your account type.' });
    const order: Record<string, number> = { BUYER: 0, SELLER: 1, BOTH: 2 };
    if ((order[role] ?? 0) <= (order[current.role] ?? 0))
      return res.status(400).json({ success: false, message: 'You can only upgrade your account type, not downgrade.' });
    const updated = await prisma.user.update({
      where:  { id: req.user!.id },
      data:   { role },
      select: safeSelect,
    });
    const token = jwt.sign(
      { id: updated.id, email: updated.email, role: updated.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' },
    );
    return res.json({ success: true, message: `Account upgraded to ${role}`, data: { user: updated, token } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Invalid role' });
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/buyer/wallet — balance + recent transactions
export const getWallet = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { walletBalance: true } });
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return res.json({ success: true, data: { balance: user?.walletBalance ?? 0, transactions } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/buyer/wallet/transactions
export const getWalletTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const page  = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip  = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.walletTransaction.count({ where: { userId: req.user!.id } }),
    ]);
    return res.json({ success: true, data: { transactions, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/buyer/wallet/topup
export const topupWallet = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, reference } = topupSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data:  { walletBalance: { increment: amount } },
      select: { walletBalance: true },
    });
    await prisma.walletTransaction.create({
      data: {
        userId: req.user!.id, type: 'TOPUP', amount,
        balance: user.walletBalance, reference,
        description: `Wallet top-up of KSH ${amount}`,
      },
    });
    return res.json({ success: true, message: `KSH ${amount} added to wallet`, data: { balance: user.walletBalance } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/buyer/wallet/withdraw
export const withdrawWallet = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, phone } = withdrawSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { walletBalance: true } });
    if (!user || user.walletBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data:  { walletBalance: { decrement: amount } },
      select: { walletBalance: true },
    });
    await prisma.walletTransaction.create({
      data: {
        userId: req.user!.id, type: 'WITHDRAWAL', amount: -amount,
        balance: updated.walletBalance,
        description: `Withdrawal of KSH ${amount} to ${phone}`,
      },
    });
    return res.json({ success: true, message: `KSH ${amount} withdrawal initiated to ${phone}`, data: { balance: updated.walletBalance } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
