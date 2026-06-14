
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const safeSelect = {
  id: true, name: true, email: true, phone: true, campus: true,
  role: true, avatar: true, sellerBalance: true, isVerified: true, createdAt: true,
};

// ── GET /api/seller/profile ───────────────────────────────────────────────────
export const getSellerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.user!.id },
      select:  { ...safeSelect, store: true, sellerVerification: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Seller not found' });
    return res.json({ success: true, data: { seller: user } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/seller/profile ───────────────────────────────────────────────────
export const updateSellerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      name:   z.string().min(2).optional(),
      phone:  z.string().optional(),
      campus: z.string().optional(),
      avatar: z.string().url().optional(),
    }).parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.id }, data, select: safeSelect });
    return res.json({ success: true, message: 'Profile updated', data: { seller: user } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/seller/store ─────────────────────────────────────────────────────
export const getStore = async (req: AuthRequest, res: Response) => {
  try {
    let store = await prisma.store.findUnique({ where: { sellerId: req.user!.id } });
    if (!store) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
      store = await prisma.store.create({ data: { sellerId: req.user!.id, name: user?.name + "'s Store" } });
    }
    return res.json({ success: true, data: { store } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/seller/store ─────────────────────────────────────────────────────
export const updateStore = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      name:           z.string().min(2).optional(),
      description:    z.string().optional(),
      banner:         z.string().optional(),
      logo:           z.string().optional(),
      theme:          z.string().optional(),
      returnPolicy:   z.string().optional(),
      deliveryPolicy: z.string().optional(),
      isOpen:         z.boolean().optional(),
      vacationMode:   z.boolean().optional(),
      categories:     z.array(z.string()).optional(),
      socialLinks:    z.record(z.string()).optional(),
      operatingHours: z.record(z.string()).optional(),
    }).parse(req.body);

    const storeData: any = { ...data };
    if (data.categories)     storeData.categories     = JSON.stringify(data.categories);
    if (data.socialLinks)    storeData.socialLinks    = JSON.stringify(data.socialLinks);
    if (data.operatingHours) storeData.operatingHours = JSON.stringify(data.operatingHours);

    const store = await prisma.store.upsert({
      where:  { sellerId: req.user!.id },
      update: storeData,
      create: { sellerId: req.user!.id, name: 'My Store', ...storeData },
    });
    return res.json({ success: true, message: 'Store updated', data: { store } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/seller/wallet ────────────────────────────────────────────────────
export const getSellerWallet = async (req: AuthRequest, res: Response) => {
  try {
    const [user, transactions, pendingOrders] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerBalance: true } }),
      prisma.walletTransaction.findMany({ where: { userId: req.user!.id, type: { in: ['EARNING', 'WITHDRAWAL', 'PAYOUT'] } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.order.aggregate({ where: { sellerId: req.user!.id, paymentStatus: 'PAID', status: { notIn: ['CANCELLED', 'REFUNDED'] } }, _sum: { total: true } }),
    ]);
    return res.json({ success: true, data: { balance: user?.sellerBalance ?? 0, pending: pendingOrders._sum.total ?? 0, transactions } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/seller/wallet/transactions ───────────────────────────────────────
export const getSellerTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const page  = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.walletTransaction.count({ where: { userId: req.user!.id } }),
    ]);
    return res.json({ success: true, data: { transactions, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── POST /api/seller/wallet/withdraw ─────────────────────────────────────────
export const requestPayout = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, phone } = z.object({ amount: z.number().positive(), phone: z.string().min(10) }).parse(req.body);
    const seller = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerBalance: true } });
    if (!seller || seller.sellerBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient seller balance' });
    }
    const payout = await prisma.payout.create({ data: { sellerId: req.user!.id, amount, phone, status: 'PENDING' } });
    await prisma.user.update({ where: { id: req.user!.id }, data: { sellerBalance: { decrement: amount } } });
    await prisma.notification.create({ data: { userId: req.user!.id, type: 'SYSTEM', title: 'Payout Requested', body: `Your payout of KSH ${amount.toLocaleString()} is being processed.` } });
    return res.status(201).json({ success: true, message: 'Payout request submitted', data: { payout } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/seller/payouts ───────────────────────────────────────────────────
export const getPayouts = async (req: AuthRequest, res: Response) => {
  try {
    const payouts = await prisma.payout.findMany({ where: { sellerId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { payouts } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/seller/notifications ────────────────────────────────────────────
export const getSellerNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);
    return res.json({ success: true, data: { notifications, unread } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/seller/settings ──────────────────────────────────────────────────
export const getSellerSettings = async (req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.sellerSettings.findUnique({ where: { sellerId: req.user!.id } });
    if (!settings) settings = await prisma.sellerSettings.create({ data: { sellerId: req.user!.id } });
    return res.json({ success: true, data: { settings } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/seller/settings ──────────────────────────────────────────────────
export const updateSellerSettings = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      newOrders:    z.boolean().optional(),
      payments:     z.boolean().optional(),
      reviews:      z.boolean().optional(),
      lowStock:     z.boolean().optional(),
      vacationMode: z.boolean().optional(),
      storeVisible: z.boolean().optional(),
      autoConfirm:  z.boolean().optional(),
    }).parse(req.body);
    const settings = await prisma.sellerSettings.upsert({ where: { sellerId: req.user!.id }, update: data, create: { sellerId: req.user!.id, ...data } });
    return res.json({ success: true, message: 'Settings updated', data: { settings } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/seller/kyc ───────────────────────────────────────────────────────
export const getKycStatus = async (req: AuthRequest, res: Response) => {
  try {
    const kyc = await prisma.sellerVerification.findUnique({ where: { sellerId: req.user!.id } });
    return res.json({ success: true, data: { kyc } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/seller/verification ─────────────────────────────────────────────
export const submitVerification = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      fullName:    z.string().min(2),
      idNumber:    z.string().min(4),
      idFront:     z.string().url(),
      idBack:      z.string().url(),
      businessDoc: z.string().optional(),
      selfie:      z.string().optional(),
    }).parse(req.body);

    const existing = await prisma.sellerVerification.findUnique({ where: { sellerId: req.user!.id } });
    if (existing?.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Your KYC is already approved' });
    }

    const verification = await prisma.sellerVerification.upsert({
      where:  { sellerId: req.user!.id },
      update: { ...data, status: 'PENDING', reviewedAt: null },
      create: { sellerId: req.user!.id, ...data, status: 'PENDING' },
    });
    return res.json({ success: true, message: 'KYC submitted for review. We will verify within 24 hours.', data: { verification } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/seller/customers ─────────────────────────────────────────────────
export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where:   { sellerId: req.user!.id, status: 'DELIVERED' },
      include: { buyer: { select: { id: true, name: true, email: true, avatar: true, campus: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const customerMap = new Map<string, any>();
    for (const order of orders) {
      const id = order.buyer.id;
      if (!customerMap.has(id)) {
        customerMap.set(id, { ...order.buyer, totalOrders: 0, totalSpent: 0, lastOrder: order.createdAt });
      }
      const c = customerMap.get(id);
      c.totalOrders++;
      c.totalSpent += order.total;
    }
    return res.json({ success: true, data: { customers: Array.from(customerMap.values()) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
