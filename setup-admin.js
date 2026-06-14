import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const B = path.join(__dirname, 'backend');

const write = (filePath, content) => {
  fs.writeFileSync(path.join(__dirname, filePath), content, 'utf8');
  console.log(`  📄 ${filePath}`);
};
const writeB = (filePath, content) => {
  fs.writeFileSync(path.join(B, filePath), content, 'utf8');
  console.log(`  📄 backend/${filePath}`);
};
const run = (cmd) => execSync(cmd, { stdio: 'inherit', cwd: B });

console.log('\n=============================================');
console.log('  👑 Kampas — Admin Backend + Dashboard');
console.log('=============================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADMIN MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/middleware/admin.ts', `
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};
`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/controllers/admin.controller.ts', `
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
export const getStats = async (_req: Request, res: Response) => {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, newUsersToday, newUsersWeek,
      totalBuyers, totalSellers,
      totalProducts, activeProducts,
      totalOrders, pendingOrders, deliveredOrders,
      totalRevenue, weekRevenue, monthRevenue,
      platformFees,
      totalAds, pendingAds,
      pendingKyc, pendingReports, openDisputes,
      totalTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.user.count({ where: { role: 'BUYER' } }),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED', createdAt: { gte: week } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED', createdAt: { gte: month } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } }).then(r => (r._sum.total ?? 0) * 0.05),
      prisma.ad.count(),
      prisma.ad.count({ where: { status: 'PENDING' } }),
      prisma.sellerVerification.count({ where: { status: 'PENDING' } }),
      prisma.productReport.count({ where: { status: 'PENDING' } }),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
      prisma.walletTransaction.count(),
    ]);

    return res.json({
      success: true,
      data: {
        users:        { total: totalUsers, buyers: totalBuyers, sellers: totalSellers, newToday: newUsersToday, newWeek: newUsersWeek },
        products:     { total: totalProducts, active: activeProducts },
        orders:       { total: totalOrders, pending: pendingOrders, delivered: deliveredOrders },
        revenue:      { total: totalRevenue._sum.total ?? 0, week: weekRevenue._sum.total ?? 0, month: monthRevenue._sum.total ?? 0 },
        platformFees: Math.round(platformFees),
        ads:          { total: totalAds, pending: pendingAds },
        moderation:   { pendingKyc, pendingReports, openDisputes },
        transactions: totalTransactions,
      },
    });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/admin/analytics ──────────────────────────────────────────────────
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where:   { status: 'DELIVERED', createdAt: { gte: from } },
      select:  { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const users = await prisma.user.findMany({
      where:   { createdAt: { gte: from } },
      select:  { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDate: Record<string, { revenue: number; orders: number; users: number }> = {};
    for (const o of orders) {
      const d = o.createdAt.toISOString().split('T')[0];
      if (!byDate[d]) byDate[d] = { revenue: 0, orders: 0, users: 0 };
      byDate[d].revenue += o.total;
      byDate[d].orders++;
    }
    for (const u of users) {
      const d = u.createdAt.toISOString().split('T')[0];
      if (!byDate[d]) byDate[d] = { revenue: 0, orders: 0, users: 0 };
      byDate[d].users++;
    }

    const chart = Object.entries(byDate).map(([date, data]) => ({
      name: new Date(date).toLocaleDateString('en-KE', { weekday: 'short' }),
      date, ...data,
    }));

    return res.json({ success: true, data: { chart, days } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/admin/users ──────────────────────────────────────────────────────
export const getUsers = async (req: Request, res: Response) => {
  try {
    const page   = parseInt(req.query.page as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 20;
    const role   = req.query.role as string;
    const search = req.query.q as string;
    const where: any = {};
    if (role)   where.role  = role;
    if (search) where.OR    = [{ name: { contains: search } }, { email: { contains: search } }];
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, campus: true, role: true, avatar: true, isVerified: true, isActive: true, walletBalance: true, sellerBalance: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    return res.json({ success: true, data: { users, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/users/:id/suspend ─────────────────────────────────────────
export const suspendUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await prisma.notification.create({ data: { userId: req.params.id, type: 'SYSTEM', title: 'Account Suspended', body: 'Your account has been suspended. Contact support for assistance.' } });
    return res.json({ success: true, message: 'User suspended' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/users/:id/activate ────────────────────────────────────────
export const activateUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: true } });
    await prisma.notification.create({ data: { userId: req.params.id, type: 'SYSTEM', title: 'Account Reactivated', body: 'Your account has been reactivated. Welcome back!' } });
    return res.json({ success: true, message: 'User activated' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/users/:id/role ─────────────────────────────────────────────
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { role } = z.object({ role: z.enum(['BUYER', 'SELLER', 'ADMIN']) }).parse(req.body);
    await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    return res.json({ success: true, message: \`User role updated to \${role}\` });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
export const deleteUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/admin/sellers ────────────────────────────────────────────────────
export const getSellers = async (req: Request, res: Response) => {
  try {
    const page   = parseInt(req.query.page as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 20;
    const search = req.query.q as string;
    const where: any = { role: 'SELLER' };
    if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }];
    const [sellers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, campus: true, avatar: true, isVerified: true, isActive: true, sellerBalance: true, createdAt: true, store: true, sellerVerification: true, _count: { select: { sellerProducts: true, sellerOrders: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    return res.json({ success: true, data: { sellers, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/admin/products ───────────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page   = parseInt(req.query.page as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 20;
    const search = req.query.q as string;
    const where: any = {};
    if (search) where.title = { contains: search };
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { images: { take: 1 }, category: true, seller: { select: { id: true, name: true, campus: true } }, _count: { select: { orderItems: true, reports: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);
    return res.json({ success: true, data: { products, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/products/:id/feature ──────────────────────────────────────
export const featureProduct = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await prisma.product.update({ where: { id: req.params.id }, data: { isFeatured: !product.isFeatured } });
    return res.json({ success: true, message: product.isFeatured ? 'Product unfeatured' : 'Product featured' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── DELETE /api/admin/products/:id ───────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    return res.json({ success: true, message: 'Product removed from marketplace' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
export const getOrders = async (req: Request, res: Response) => {
  try {
    const page   = parseInt(req.query.page as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const where: any = {};
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { buyer: { select: { id: true, name: true, email: true } }, seller: { select: { id: true, name: true } }, items: { include: { product: { select: { title: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    return res.json({ success: true, data: { orders, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/admin/transactions ───────────────────────────────────────────────
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const page  = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type  = req.query.type as string;
    const where: any = {};
    if (type) where.type = type;
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({ where, include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.walletTransaction.count({ where }),
    ]);
    return res.json({ success: true, data: { transactions, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/admin/ads ────────────────────────────────────────────────────────
export const getAds = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const where: any = {};
    if (status) where.status = status;
    const ads = await prisma.ad.findMany({ where, include: { seller: { select: { id: true, name: true, campus: true } }, product: { select: { title: true, images: true } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { ads } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/ads/:id/approve ────────────────────────────────────────────
export const approveAd = async (req: Request, res: Response) => {
  try {
    const ad = await prisma.ad.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } });
    await prisma.notification.create({ data: { userId: ad.sellerId, type: 'SYSTEM', title: '✅ Ad Approved!', body: \`Your ad "\${ad.title}" is now live on Kampas.\` } });
    return res.json({ success: true, message: 'Ad approved and activated' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/ads/:id/reject ─────────────────────────────────────────────
export const rejectAd = async (req: Request, res: Response) => {
  try {
    const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);
    const ad = await prisma.ad.update({ where: { id: req.params.id }, data: { status: 'ENDED' } });
    await prisma.notification.create({ data: { userId: ad.sellerId, type: 'SYSTEM', title: '❌ Ad Rejected', body: \`Your ad "\${ad.title}" was rejected. Reason: \${reason}\` } });
    return res.json({ success: true, message: 'Ad rejected' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/admin/kyc ────────────────────────────────────────────────────────
export const getKYC = async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'PENDING';
    const verifications = await prisma.sellerVerification.findMany({
      where:   { status },
      include: { seller: { select: { id: true, name: true, email: true, campus: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: { verifications } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/kyc/:id/approve ───────────────────────────────────────────
export const approveKYC = async (req: Request, res: Response) => {
  try {
    const kyc = await prisma.sellerVerification.update({ where: { id: req.params.id }, data: { status: 'APPROVED' } });
    await prisma.user.update({ where: { id: kyc.sellerId }, data: { isVerified: true } });
    await prisma.notification.create({ data: { userId: kyc.sellerId, type: 'SYSTEM', title: '✅ Seller Verified!', body: 'Your seller account has been verified. You now have a verified badge on Kampas.' } });
    return res.json({ success: true, message: 'Seller verified successfully' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/kyc/:id/reject ────────────────────────────────────────────
export const rejectKYC = async (req: Request, res: Response) => {
  try {
    const { notes } = z.object({ notes: z.string().min(5) }).parse(req.body);
    const kyc = await prisma.sellerVerification.update({ where: { id: req.params.id }, data: { status: 'REJECTED', notes } });
    await prisma.notification.create({ data: { userId: kyc.sellerId, type: 'SYSTEM', title: 'Verification Rejected', body: \`Your verification was rejected. Reason: \${notes}. Please resubmit with correct documents.\` } });
    return res.json({ success: true, message: 'Verification rejected' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/admin/reports ────────────────────────────────────────────────────
export const getReports = async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'PENDING';
    const reports = await prisma.productReport.findMany({
      where:   { status },
      include: { product: { include: { images: { take: 1 }, seller: { select: { id: true, name: true } } } }, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: { reports } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/reports/:id/resolve ───────────────────────────────────────
export const resolveReport = async (req: Request, res: Response) => {
  try {
    const { action } = z.object({ action: z.enum(['DISMISS', 'REMOVE_PRODUCT']) }).parse(req.body);
    const report = await prisma.productReport.update({ where: { id: req.params.id }, data: { status: 'RESOLVED' } });
    if (action === 'REMOVE_PRODUCT') {
      await prisma.product.update({ where: { id: report.productId }, data: { isActive: false } });
    }
    return res.json({ success: true, message: action === 'REMOVE_PRODUCT' ? 'Report resolved and product removed' : 'Report dismissed' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/admin/disputes ───────────────────────────────────────────────────
export const getDisputes = async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'OPEN';
    const disputes = await prisma.dispute.findMany({
      where:   { status },
      include: { order: { include: { buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } } } }, raisedBy: { select: { id: true, name: true, email: true } }, evidence: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: { disputes } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/disputes/:id/resolve ──────────────────────────────────────
export const resolveDispute = async (req: Request, res: Response) => {
  try {
    const { resolution, refundBuyer } = z.object({ resolution: z.string().min(10), refundBuyer: z.boolean().default(false) }).parse(req.body);
    const dispute = await prisma.dispute.update({ where: { id: req.params.id }, data: { status: 'RESOLVED', resolution } });
    const order   = await prisma.order.findUnique({ where: { id: dispute.orderId } });

    if (order && refundBuyer && order.paymentStatus === 'PAID') {
      const updated = await prisma.user.update({ where: { id: order.buyerId }, data: { walletBalance: { increment: order.total } }, select: { walletBalance: true } });
      await prisma.walletTransaction.create({ data: { userId: order.buyerId, type: 'REFUND', amount: order.total, balance: updated.walletBalance, description: \`Admin dispute refund for order #\${order.id.slice(-6).toUpperCase()}\` } });
      await prisma.notification.create({ data: { userId: order.buyerId, type: 'SYSTEM', title: 'Dispute Resolved — Refunded', body: \`Your dispute was resolved. KSH \${order.total.toLocaleString()} has been refunded.\` } });
    }

    await prisma.notification.create({ data: { userId: dispute.raisedById, type: 'SYSTEM', title: 'Dispute Resolved', body: \`Your dispute has been resolved. \${resolution}\` } });
    return res.json({ success: true, message: 'Dispute resolved' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/admin/make-admin ────────────────────────────────────────────────
export const makeAdmin = async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    return res.json({ success: true, message: \`\${user.name} is now an admin\` });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/routes/admin.routes.ts', `
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import {
  getStats, getAnalytics,
  getUsers, suspendUser, activateUser, updateUserRole, deleteUser,
  getSellers,
  getProducts, featureProduct, deleteProduct,
  getOrders,
  getTransactions,
  getAds, approveAd, rejectAd,
  getKYC, approveKYC, rejectKYC,
  getReports, resolveReport,
  getDisputes, resolveDispute,
  makeAdmin,
} from '../controllers/admin.controller.js';

const r = Router();
r.use(authenticate, requireAdmin);

// Platform stats & analytics
r.get('/stats',           getStats);
r.get('/analytics',       getAnalytics);

// Users
r.get('/users',                    getUsers);
r.put('/users/:id/suspend',        suspendUser);
r.put('/users/:id/activate',       activateUser);
r.put('/users/:id/role',           updateUserRole);
r.delete('/users/:id',             deleteUser);

// Sellers
r.get('/sellers',                  getSellers);

// Products
r.get('/products',                 getProducts);
r.put('/products/:id/feature',     featureProduct);
r.delete('/products/:id',          deleteProduct);

// Orders
r.get('/orders',                   getOrders);

// Transactions
r.get('/transactions',             getTransactions);

// Ads
r.get('/ads',                      getAds);
r.put('/ads/:id/approve',          approveAd);
r.put('/ads/:id/reject',           rejectAd);

// KYC
r.get('/kyc',                      getKYC);
r.put('/kyc/:id/approve',          approveKYC);
r.put('/kyc/:id/reject',           rejectKYC);

// Reports
r.get('/reports',                  getReports);
r.put('/reports/:id/resolve',      resolveReport);

// Disputes
r.get('/disputes',                 getDisputes);
r.put('/disputes/:id/resolve',     resolveDispute);

// Make admin (public endpoint — use once then remove)
r.post('/make-admin',              makeAdmin);

export default r;
`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. UPDATE INDEX.TS
// ─────────────────────────────────────────────────────────────────────────────
const indexPath = path.join(B, 'src/index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');
if (!indexContent.includes('adminRoutes')) {
  indexContent = indexContent.replace(
    `import authRoutes    from './routes/auth.routes.js';`,
    `import authRoutes    from './routes/auth.routes.js';
import adminRoutes   from './routes/admin.routes.js';`
  );
  indexContent = indexContent.replace(
    `app.use('/api/auth',    authRoutes);`,
    `app.use('/api/auth',    authRoutes);
app.use('/api/admin',   adminRoutes);`
  );
  fs.writeFileSync(indexPath, indexContent);
  console.log('  📄 backend/src/index.ts (admin routes added)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN DASHBOARD FRONTEND
// ─────────────────────────────────────────────────────────────────────────────
write('src/pages/AdminDashboard.tsx', `
import {
  Users, DollarSign, Package, Activity, AlertTriangle, Shield, TrendingUp, Search,
  Store, ShoppingCart, Truck, CreditCard, Megaphone, Calendar, HelpCircle,
  LayoutDashboard, Bell, Settings, Power, ChevronRight, Filter, CheckCircle,
  XCircle, Eye, Star, RefreshCw, AlertCircle, Database, Zap,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET, PUT, DEL, POST } from '../lib/api';

type TabType = 'dashboard'|'users'|'sellers'|'products'|'orders'|'transactions'|'ads'|'kyc'|'reports'|'disputes'|'support';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab,    setActiveTab]    = useState<TabType>('dashboard');
  const [isSidebarOpen,setIsSidebarOpen]= useState(true);

  // Data states
  const [stats,        setStats]        = useState<any>(null);
  const [chartData,    setChartData]    = useState<any[]>([]);
  const [users,        setUsers]        = useState<any[]>([]);
  const [sellers,      setSellers]      = useState<any[]>([]);
  const [products,     setProducts]     = useState<any[]>([]);
  const [orders,       setOrders]       = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ads,          setAds]          = useState<any[]>([]);
  const [kyc,          setKyc]          = useState<any[]>([]);
  const [reports,      setReports]      = useState<any[]>([]);
  const [disputes,     setDisputes]     = useState<any[]>([]);

  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [toast,        setToast]        = useState<{ msg: string; type: 'success'|'error' } | null>(null);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    const map: Record<TabType, () => void> = {
      dashboard:    fetchStats,
      users:        () => fetchUsers(),
      sellers:      fetchSellers,
      products:     () => fetchProducts(),
      orders:       fetchOrders,
      transactions: fetchTransactions,
      ads:          fetchAds,
      kyc:          fetchKYC,
      reports:      fetchReports,
      disputes:     fetchDisputes,
      support:      () => {},
    };
    map[activeTab]?.();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const [statsRes, anaRes] = await Promise.all([GET('/api/admin/stats'), GET('/api/admin/analytics')]);
      setStats(statsRes.data);
      setChartData(anaRes.data.chart);
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async (q = '') => {
    setLoading(true);
    try { const r = await GET(\`/api/admin/users?q=\${q}&limit=30\`); setUsers(r.data.users); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchSellers = async () => {
    setLoading(true);
    try { const r = await GET('/api/admin/sellers?limit=30'); setSellers(r.data.sellers); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchProducts = async (q = '') => {
    setLoading(true);
    try { const r = await GET(\`/api/admin/products?q=\${q}&limit=30\`); setProducts(r.data.products); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try { const r = await GET('/api/admin/orders?limit=30'); setOrders(r.data.orders); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try { const r = await GET('/api/admin/transactions?limit=30'); setTransactions(r.data.transactions); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchAds = async () => {
    setLoading(true);
    try { const r = await GET('/api/admin/ads'); setAds(r.data.ads); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchKYC = async () => {
    setLoading(true);
    try { const r = await GET('/api/admin/kyc'); setKyc(r.data.verifications); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchReports = async () => {
    setLoading(true);
    try { const r = await GET('/api/admin/reports'); setReports(r.data.reports); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchDisputes = async () => {
    setLoading(true);
    try { const r = await GET('/api/admin/disputes'); setDisputes(r.data.disputes); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const action = async (fn: () => Promise<void>, successMsg: string) => {
    try { await fn(); showToast(successMsg); fetchStats(); }
    catch (err: any) { showToast(err.message || 'Action failed', 'error'); }
  };

  const NavItem = ({ id, label, icon: Icon, badge }: { id: TabType; label: string; icon: any; badge?: number }) => {
    const isActive = activeTab === id;
    return (
      <button onClick={() => setActiveTab(id)}
        className={\`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group \${isActive ? 'bg-pink-500/10 text-pink-600 font-bold' : 'text-gray-600 hover:text-gray-900 hover:bg-pink-50'}\`}>
        <div className="flex items-center gap-3">
          <Icon className={\`w-5 h-5 \${isActive ? 'text-pink-600' : 'group-hover:text-pink-500 transition-colors'}\`} />
          {isSidebarOpen && <span className="text-sm tracking-wide">{label}</span>}
        </div>
        {isSidebarOpen && badge != null && badge > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-500 text-white">{badge}</span>
        )}
      </button>
    );
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-700', ACTIVE: 'bg-green-100 text-green-700', DELIVERED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-600', OPEN: 'bg-orange-100 text-orange-600', RESOLVED: 'bg-blue-100 text-blue-700', APPROVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-600' };
    return <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${map[s] || 'bg-gray-100 text-gray-600'}\`}>{s}</span>;
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={\`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 \${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}\`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside className={\`relative z-20 flex flex-col bg-white border-r border-pink-100 transition-all duration-300 \${isSidebarOpen ? 'w-64' : 'w-20'}\`}>
        <div className="p-5 border-b border-pink-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center font-bold text-white text-lg shadow-lg">K</div>
            {isSidebarOpen && (
              <div>
                <p className="font-bold text-sm leading-none">Kampas <span className="text-pink-500 font-light">OS</span></p>
                <p className="text-[10px] text-pink-500 font-mono mt-0.5 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" /> Super Admin
                </p>
              </div>
            )}
          </Link>
          <button onClick={() => setIsSidebarOpen(v => !v)} className="text-gray-400 hover:text-gray-600">
            <ChevronRight className={\`w-4 h-4 transition-transform \${isSidebarOpen ? 'rotate-180' : ''}\`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
          <div className="space-y-1">
            {isSidebarOpen && <p className="text-[10px] text-gray-400 font-bold px-4 mb-2 uppercase tracking-widest">Command Center</p>}
            <NavItem id="dashboard"    label="Dashboard"         icon={LayoutDashboard} />
          </div>
          <div className="space-y-1">
            {isSidebarOpen && <p className="text-[10px] text-gray-400 font-bold px-4 mb-2 uppercase tracking-widest">Ecosystem</p>}
            <NavItem id="users"       label="Users"              icon={Users}           badge={stats?.users?.total} />
            <NavItem id="sellers"     label="Sellers"            icon={Store}           badge={stats?.users?.sellers} />
            <NavItem id="products"    label="Products"           icon={Package}         badge={stats?.products?.total} />
          </div>
          <div className="space-y-1">
            {isSidebarOpen && <p className="text-[10px] text-gray-400 font-bold px-4 mb-2 uppercase tracking-widest">Operations</p>}
            <NavItem id="orders"       label="Orders"            icon={Truck}           badge={stats?.orders?.pending} />
            <NavItem id="transactions" label="Transactions"      icon={DollarSign}      />
            <NavItem id="ads"          label="Ad Network"        icon={Megaphone}       badge={stats?.ads?.pending} />
          </div>
          <div className="space-y-1">
            {isSidebarOpen && <p className="text-[10px] text-gray-400 font-bold px-4 mb-2 uppercase tracking-widest">Security</p>}
            <NavItem id="kyc"          label="KYC Gateway"       icon={Shield}          badge={stats?.moderation?.pendingKyc} />
            <NavItem id="reports"      label="Reports"           icon={AlertTriangle}   badge={stats?.moderation?.pendingReports} />
            <NavItem id="disputes"     label="Disputes"          icon={HelpCircle}      badge={stats?.moderation?.openDisputes} />
          </div>
        </div>

        <div className="p-3 border-t border-pink-100">
          <button onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Power className="w-5 h-5" />
            {isSidebarOpen && <span className="font-bold text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen bg-gray-50 overflow-hidden">

        {/* Header */}
        <header className="h-16 bg-white border-b border-pink-100 flex items-center justify-between px-6 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search users, orders, products..."
              value={search} onChange={e => { setSearch(e.target.value); if (activeTab === 'users') fetchUsers(e.target.value); if (activeTab === 'products') fetchProducts(e.target.value); }}
              className="bg-gray-100 border border-transparent rounded-xl py-2 pl-9 pr-4 text-sm w-72 focus:outline-none focus:border-pink-500 focus:bg-white transition-all" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> System Nominal
            </div>
            <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-sm">A</div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Platform Overview</h1>
                <p className="text-gray-500 text-sm mt-1">Real-time Kampas ecosystem metrics</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users',     value: stats?.users?.total ?? 0,                      sub: \`+\${stats?.users?.newToday ?? 0} today\`,        icon: Users,      color: 'text-blue-600',   bg: 'bg-blue-50' },
                  { label: 'Platform Revenue', value: \`KSH \${(stats?.revenue?.total ?? 0).toLocaleString()}\`, sub: \`KSH \${(stats?.revenue?.week ?? 0).toLocaleString()} this week\`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Platform Fees',   value: \`KSH \${(stats?.platformFees ?? 0).toLocaleString()}\`,  sub: '5% of all sales',                        icon: TrendingUp, color: 'text-pink-600',  bg: 'bg-pink-50' },
                  { label: 'Total Orders',    value: stats?.orders?.total ?? 0,                     sub: \`\${stats?.orders?.pending ?? 0} pending\`,        icon: ShoppingCart,color:'text-purple-600',bg:'bg-purple-50'},
                  { label: 'Active Products', value: stats?.products?.active ?? 0,                  sub: \`\${stats?.products?.total ?? 0} total listed\`,  icon: Package,    color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'Sellers',         value: stats?.users?.sellers ?? 0,                    sub: \`\${stats?.users?.buyers ?? 0} buyers\`,           icon: Store,      color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Pending Ads',     value: stats?.ads?.pending ?? 0,                      sub: \`\${stats?.ads?.total ?? 0} total campaigns\`,    icon: Megaphone,  color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'Open Disputes',   value: stats?.moderation?.openDisputes ?? 0,          sub: \`\${stats?.moderation?.pendingReports ?? 0} reports\`,icon: AlertTriangle,color:'text-red-600',bg:'bg-red-50'},
                ].map((s, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-pink-300 transition-colors">
                    <div className={\`w-9 h-9 rounded-xl \${s.bg} flex items-center justify-center mb-3\`}>
                      <s.icon className={\`w-4 h-4 \${s.color}\`} />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Revenue chart */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="font-bold mb-5">Revenue — Last 7 Days</h3>
                {chartData.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#ec4899" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => \`\${v/1000}k\`} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} formatter={(v: any) => [\`KSH \${v.toLocaleString()}\`, 'Revenue']} />
                        <Area type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} fill="url(#rev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Review KYC',      tab: 'kyc' as TabType,      badge: stats?.moderation?.pendingKyc,    color: 'bg-blue-500' },
                  { label: 'Approve Ads',     tab: 'ads' as TabType,      badge: stats?.ads?.pending,              color: 'bg-yellow-500' },
                  { label: 'Resolve Disputes',tab: 'disputes' as TabType, badge: stats?.moderation?.openDisputes,  color: 'bg-orange-500' },
                  { label: 'Review Reports',  tab: 'reports' as TabType,  badge: stats?.moderation?.pendingReports,color: 'bg-red-500' },
                ].map((a, i) => (
                  <button key={i} onClick={() => setActiveTab(a.tab)}
                    className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-pink-300 transition-colors">
                    <div className={\`w-8 h-8 \${a.color} rounded-xl flex items-center justify-center text-white font-bold text-sm mb-3\`}>
                      {a.badge ?? 0}
                    </div>
                    <p className="text-sm font-bold text-gray-900">{a.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.badge ?? 0} pending</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">User Matrix</h2>
              {loading ? <LoadingRows /> : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['User','Role','Campus','Balance','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={u.avatar || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${u.name}\`} className="w-8 h-8 rounded-full" />
                              <div>
                                <p className="font-semibold text-gray-900">{u.name}</p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className={\`text-xs font-bold px-2 py-0.5 rounded-full \${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'SELLER' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}\`}>{u.role}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-500">{u.campus}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-900">KSH {(u.walletBalance ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3">{statusBadge(u.isActive ? 'ACTIVE' : 'SUSPENDED')}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {u.isActive
                                ? <button onClick={() => action(() => PUT(\`/api/admin/users/\${u.id}/suspend\`, {}), 'User suspended').then(fetchUsers)} className="text-xs bg-red-50 border border-red-200 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100">Suspend</button>
                                : <button onClick={() => action(() => PUT(\`/api/admin/users/\${u.id}/activate\`, {}), 'User activated').then(fetchUsers)} className="text-xs bg-green-50 border border-green-200 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100">Activate</button>
                              }
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && <EmptyState label="users" />}
                </div>
              )}
            </div>
          )}

          {/* ── SELLERS ── */}
          {activeTab === 'sellers' && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Business Hub</h2>
              {loading ? <LoadingRows /> : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Seller','Store','Campus','Products','Orders','Verified','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sellers.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={s.avatar || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${s.name}\`} className="w-8 h-8 rounded-full" />
                              <div>
                                <p className="font-semibold text-gray-900">{s.name}</p>
                                <p className="text-xs text-gray-400">{s.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{s.store?.name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{s.campus}</td>
                          <td className="px-4 py-3 text-xs font-bold">{s._count?.sellerProducts ?? 0}</td>
                          <td className="px-4 py-3 text-xs font-bold">{s._count?.sellerOrders ?? 0}</td>
                          <td className="px-4 py-3">
                            {s.isVerified
                              ? <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">✓ Verified</span>
                              : <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">Pending</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {s.sellerVerification?.status === 'PENDING' && (
                              <button onClick={() => action(() => PUT(\`/api/admin/kyc/\${s.sellerVerification.id}/approve\`, {}), 'Seller verified').then(fetchSellers)} className="text-xs bg-green-50 border border-green-200 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100">
                                Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sellers.length === 0 && <EmptyState label="sellers" />}
                </div>
              )}
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Global Inventory</h2>
              {loading ? <LoadingRows /> : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Product','Seller','Price','Stock','Reports','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-pink-50 flex-shrink-0">
                                {p.images?.[0]?.url ? <img src={p.images[0].url} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-pink-300 m-auto mt-2.5" />}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 truncate max-w-[150px]">{p.title}</p>
                                <p className="text-xs text-gray-400">{p.condition}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{p.seller?.name}</td>
                          <td className="px-4 py-3 text-xs font-bold text-pink-600">KSH {p.price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs">{p.stock}</td>
                          <td className="px-4 py-3">
                            {(p._count?.reports ?? 0) > 0 && <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{p._count.reports} reports</span>}
                          </td>
                          <td className="px-4 py-3">{statusBadge(p.isActive ? 'ACTIVE' : 'INACTIVE')}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => action(() => PUT(\`/api/admin/products/\${p.id}/feature\`, {}), 'Product updated').then(() => fetchProducts())} className={\`text-xs px-2 py-1 rounded-lg border transition-colors \${p.isFeatured ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-yellow-50'}\`}>
                                {p.isFeatured ? '⭐ Unfeature' : '☆ Feature'}
                              </button>
                              {p.isActive && <button onClick={() => action(() => DEL(\`/api/admin/products/\${p.id}\`), 'Product removed').then(() => fetchProducts())} className="text-xs bg-red-50 border border-red-200 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100">Remove</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length === 0 && <EmptyState label="products" />}
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Logistics</h2>
              {loading ? <LoadingRows /> : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Order','Buyer','Seller','Items','Total','Payment','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono font-bold text-pink-600">#{o.id.slice(-6).toUpperCase()}</td>
                          <td className="px-4 py-3 text-xs text-gray-700">{o.buyer?.name}</td>
                          <td className="px-4 py-3 text-xs text-gray-700">{o.seller?.name}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</td>
                          <td className="px-4 py-3 text-xs font-bold">KSH {o.total.toLocaleString()}</td>
                          <td className="px-4 py-3">{statusBadge(o.paymentStatus)}</td>
                          <td className="px-4 py-3">{statusBadge(o.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length === 0 && <EmptyState label="orders" />}
                </div>
              )}
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {activeTab === 'transactions' && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Financial Engine</h2>
              {loading ? <LoadingRows /> : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['User','Type','Amount','Balance','Description','Date'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-900">{t.user?.name}</p>
                            <p className="text-[10px] text-gray-400">{t.user?.role}</p>
                          </td>
                          <td className="px-4 py-3"><span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-full">{t.type}</span></td>
                          <td className="px-4 py-3 text-xs font-bold"><span className={t.amount > 0 ? 'text-green-600' : 'text-red-500'}>{t.amount > 0 ? '+' : ''}KSH {Math.abs(t.amount).toLocaleString()}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-600">KSH {t.balance.toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{t.description}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-KE')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transactions.length === 0 && <EmptyState label="transactions" />}
                </div>
              )}
            </div>
          )}

          {/* ── ADS ── */}
          {activeTab === 'ads' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Ad Network</h2>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-full">{ads.filter(a => a.status === 'PENDING').length} pending review</span>
              </div>
              {loading ? <LoadingRows /> : (
                <div className="space-y-3">
                  {ads.map(ad => (
                    <div key={ad.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:border-pink-300 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm">{ad.title}</p>
                          {statusBadge(ad.status)}
                        </div>
                        <p className="text-xs text-gray-500">By {ad.seller?.name} · {ad.targetCampus || 'All campuses'} · Budget: KSH {ad.budget.toLocaleString()}</p>
                        {ad.description && <p className="text-xs text-gray-400 mt-1">{ad.description}</p>}
                      </div>
                      {ad.status === 'PENDING' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => action(() => PUT(\`/api/admin/ads/\${ad.id}/approve\`, {}), 'Ad approved!').then(fetchAds)} className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => { const r = prompt('Reason for rejection:'); if (r) action(() => PUT(\`/api/admin/ads/\${ad.id}/reject\`, { reason: r }), 'Ad rejected').then(fetchAds); }} className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {ads.length === 0 && <EmptyState label="ads" />}
                </div>
              )}
            </div>
          )}

          {/* ── KYC ── */}
          {activeTab === 'kyc' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">KYC Gateway</h2>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">{kyc.length} pending</span>
              </div>
              {loading ? <LoadingRows /> : (
                <div className="space-y-3">
                  {kyc.map(k => (
                    <div key={k.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-pink-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <img src={k.seller?.avatar || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${k.seller?.name}\`} className="w-12 h-12 rounded-full border border-pink-200" />
                          <div>
                            <p className="font-bold text-gray-900">{k.seller?.name}</p>
                            <p className="text-xs text-gray-400">{k.seller?.email} · {k.seller?.campus}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Submitted {new Date(k.createdAt).toLocaleDateString('en-KE')}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => action(() => PUT(\`/api/admin/kyc/\${k.id}/approve\`, {}), 'Seller verified!').then(fetchKYC)} className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => { const r = prompt('Reason for rejection:'); if (r) action(() => PUT(\`/api/admin/kyc/\${k.id}/reject\`, { notes: r }), 'Verification rejected').then(fetchKYC); }} className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        {[{ label: 'ID Front', url: k.idFront }, { label: 'ID Back', url: k.idBack }, { label: 'Selfie', url: k.selfie }].filter(d => d.url).map((d, i) => (
                          <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center hover:border-pink-300 transition-colors">
                            <Shield className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">{d.label}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                  {kyc.length === 0 && <EmptyState label="KYC requests" />}
                </div>
              )}
            </div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Threat Reports</h2>
                <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">{reports.length} pending</span>
              </div>
              {loading ? <LoadingRows /> : (
                <div className="space-y-3">
                  {reports.map(r => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-pink-300 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-pink-50 flex-shrink-0">
                            {r.product?.images?.[0]?.url ? <img src={r.product.images[0].url} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-pink-300 m-auto mt-3" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{r.product?.title}</p>
                            <p className="text-xs text-gray-400">by {r.product?.seller?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{r.reason}</span>
                              <span className="text-xs text-gray-400">reported by {r.user?.name}</span>
                            </div>
                            {r.details && <p className="text-xs text-gray-400 mt-1">{r.details}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => action(() => PUT(\`/api/admin/reports/\${r.id}/resolve\`, { action: 'DISMISS' }), 'Report dismissed').then(fetchReports)} className="bg-gray-50 border border-gray-200 text-gray-600 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-gray-100">Dismiss</button>
                          <button onClick={() => action(() => PUT(\`/api/admin/reports/\${r.id}/resolve\`, { action: 'REMOVE_PRODUCT' }), 'Product removed').then(fetchReports)} className="bg-red-500 text-white text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-red-600">Remove Product</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && <EmptyState label="reports" />}
                </div>
              )}
            </div>
          )}

          {/* ── DISPUTES ── */}
          {activeTab === 'disputes' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Dispute Resolution</h2>
                <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1.5 rounded-full">{disputes.length} open</span>
              </div>
              {loading ? <LoadingRows /> : (
                <div className="space-y-3">
                  {disputes.map(d => (
                    <div key={d.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-pink-300 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm">Order #{d.order?.id.slice(-6).toUpperCase()}</span>
                            {statusBadge(d.status)}
                          </div>
                          <p className="text-xs text-gray-600 mb-1"><strong>Buyer:</strong> {d.order?.buyer?.name} vs <strong>Seller:</strong> {d.order?.seller?.name}</p>
                          <p className="text-xs text-gray-600 mb-1"><strong>Reason:</strong> {d.reason}</p>
                          {d.description && <p className="text-xs text-gray-400">{d.description}</p>}
                          {d.resolution && <p className="text-xs text-blue-600 mt-2 bg-blue-50 rounded-lg p-2"><strong>Resolution:</strong> {d.resolution}</p>}
                        </div>
                        {d.status === 'OPEN' && (
                          <button onClick={() => {
                            const resolution = prompt('Resolution (this will be sent to buyer & seller):');
                            if (!resolution) return;
                            const refund = confirm('Refund the buyer?');
                            action(() => PUT(\`/api/admin/disputes/\${d.id}/resolve\`, { resolution, refundBuyer: refund }), refund ? 'Dispute resolved + buyer refunded' : 'Dispute resolved').then(fetchDisputes);
                          }} className="bg-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-pink-600 flex-shrink-0">
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {disputes.length === 0 && <EmptyState label="disputes" />}
                </div>
              )}
            </div>
          )}

          {/* ── SUPPORT ── */}
          {activeTab === 'support' && (
            <div className="text-center py-20">
              <HelpCircle className="w-12 h-12 text-pink-200 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">Support Tickets</p>
              <p className="text-gray-400 text-sm mt-1">Coming in Phase 2</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <Database className="w-10 h-10 mx-auto mb-3 text-gray-200" />
      <p className="text-sm">No {label} found</p>
    </div>
  );
}
`);

console.log('\n=============================================');
console.log('  ✅ Admin Backend + Dashboard complete!');
console.log('');
console.log('  Backend endpoints:');
console.log('  GET  /api/admin/stats');
console.log('  GET  /api/admin/analytics');
console.log('  GET/PUT/DELETE /api/admin/users');
console.log('  GET  /api/admin/sellers');
console.log('  GET/PUT/DELETE /api/admin/products');
console.log('  GET  /api/admin/orders');
console.log('  GET  /api/admin/transactions');
console.log('  GET/PUT /api/admin/ads (approve/reject)');
console.log('  GET/PUT /api/admin/kyc (approve/reject)');
console.log('  GET/PUT /api/admin/reports (resolve)');
console.log('  GET/PUT /api/admin/disputes (resolve)');
console.log('');
console.log('  Dashboard tabs:');
console.log('  Dashboard | Users | Sellers | Products');
console.log('  Orders | Transactions | Ads | KYC');
console.log('  Reports | Disputes');
console.log('');
console.log('  Next: Create admin user');
console.log('  POST /api/admin/make-admin');
console.log('  { "email": "your@email.com" }');
console.log('=============================================\n');