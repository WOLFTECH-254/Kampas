
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
    return res.json({ success: true, message: `User role updated to ${role}` });
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
    await prisma.notification.create({ data: { userId: ad.sellerId, type: 'SYSTEM', title: '✅ Ad Approved!', body: `Your ad "${ad.title}" is now live on Kampas.` } });
    return res.json({ success: true, message: 'Ad approved and activated' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/admin/ads/:id/reject ─────────────────────────────────────────────
export const rejectAd = async (req: Request, res: Response) => {
  try {
    const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);
    const ad = await prisma.ad.update({ where: { id: req.params.id }, data: { status: 'ENDED' } });
    await prisma.notification.create({ data: { userId: ad.sellerId, type: 'SYSTEM', title: '❌ Ad Rejected', body: `Your ad "${ad.title}" was rejected. Reason: ${reason}` } });
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
    await prisma.notification.create({ data: { userId: kyc.sellerId, type: 'SYSTEM', title: 'Verification Rejected', body: `Your verification was rejected. Reason: ${notes}. Please resubmit with correct documents.` } });
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
      await prisma.walletTransaction.create({ data: { userId: order.buyerId, type: 'REFUND', amount: order.total, balance: updated.walletBalance, description: `Admin dispute refund for order #${order.id.slice(-6).toUpperCase()}` } });
      await prisma.notification.create({ data: { userId: order.buyerId, type: 'SYSTEM', title: 'Dispute Resolved — Refunded', body: `Your dispute was resolved. KSH ${order.total.toLocaleString()} has been refunded.` } });
    }

    await prisma.notification.create({ data: { userId: dispute.raisedById, type: 'SYSTEM', title: 'Dispute Resolved', body: `Your dispute has been resolved. ${resolution}` } });
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
    return res.json({ success: true, message: `${user.name} is now an admin` });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/admin/announcements ────────────────────────────────────────────
export const sendAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, target } = z.object({
      title:  z.string().min(3).max(100),
      body:   z.string().min(10).max(500),
      target: z.enum(['ALL', 'BUYERS', 'SELLERS', 'ADMINS']),
    }).parse(req.body);

    const where: any = {};
    if (target === 'BUYERS')  where.role = 'BUYER';
    if (target === 'SELLERS') where.role = 'SELLER';
    if (target === 'ADMINS')  where.role = 'ADMIN';

    const users = await prisma.user.findMany({ where, select: { id: true } });

    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        type:   'SYSTEM',
        title,
        body,
      })),
    });

    return res.json({ success: true, message: `Announcement sent to ${users.length} users` });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/admin/settings/test-brevo ───────────────────────────────────────
export const testBrevoConnection = async (req: Request, res: Response) => {
  try {
    const { api_key, smtp_user, smtp_pass, sender_name, sender_email } = req.body as Record<string, string>;

    const updates: Record<string, string> = {};
    if (api_key     !== undefined) updates.brevo_api_key      = api_key;
    if (smtp_user   !== undefined) updates.brevo_smtp_user    = smtp_user;
    if (smtp_pass   !== undefined) updates.brevo_smtp_pass    = smtp_pass;
    if (sender_name !== undefined) updates.brevo_sender_name  = sender_name;
    if (sender_email!== undefined) updates.brevo_sender_email = sender_email;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }

    // Prefer API key test
    const resolvedApiKey = api_key || (await prisma.systemSetting.findUnique({ where: { key: 'brevo_api_key' } }))?.value;
    if (resolvedApiKey) {
      const axios = (await import('axios')).default;
      try {
        const resp = await axios.get('https://api.brevo.com/v3/account', {
          headers: { 'api-key': resolvedApiKey },
        });
        const plan = resp.data?.plan?.[0]?.type || 'active';
        return res.json({ success: true, message: `✅ Brevo API connected — plan: ${plan}` });
      } catch (e: any) {
        const msg = e.response?.data?.message || e.message || 'Invalid API key';
        return res.status(400).json({ success: false, message: `Brevo API error: ${msg}` });
      }
    }

    // Fall back to SMTP verify
    const user = smtp_user || (await prisma.systemSetting.findUnique({ where: { key: 'brevo_smtp_user' } }))?.value;
    const pass = smtp_pass || (await prisma.systemSetting.findUnique({ where: { key: 'brevo_smtp_pass' } }))?.value;
    if (!user || !pass) {
      return res.status(400).json({ success: false, message: 'Provide a Brevo API key or SMTP credentials' });
    }
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: 'smtp-relay.brevo.com', port: 587, secure: false,
      auth: { user, pass },
    });
    await transporter.verify();
    return res.json({ success: true, message: '✅ Brevo SMTP connection verified successfully' });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Connection failed' });
  }
};

// ── POST /api/admin/settings/test-paystack ────────────────────────────────────
export const testPaystackConnection = async (req: Request, res: Response) => {
  try {
    const { secret_key, public_key } = req.body as Record<string, string>;

    const updates: Record<string, string> = {};
    if (secret_key !== undefined) updates.paystack_secret_key = secret_key;
    if (public_key !== undefined) updates.paystack_public_key = public_key;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }

    const key = secret_key || (await prisma.systemSetting.findUnique({ where: { key: 'paystack_secret_key' } }))?.value
                           || process.env.PAYSTACK_SECRET_KEY;

    if (!key) {
      return res.status(400).json({ success: false, message: 'Paystack secret key is required' });
    }

    const axios = (await import('axios')).default;
    const resp = await axios.get('https://api.paystack.co/bank', {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (resp.data?.status) {
      return res.json({ success: true, message: '✅ Paystack connection verified successfully' });
    }
    return res.status(400).json({ success: false, message: 'Invalid Paystack response' });
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || 'Connection failed';
    return res.status(400).json({ success: false, message: msg });
  }
};

// ── GET /api/admin/settings ───────────────────────────────────────────────────
const DEFAULT_SETTINGS: Record<string, string> = {
  referral_enabled:       'false',
  referral_reward_amount: '50',
};

async function upsertDefaults() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.systemSetting.upsert({
      where:  { key },
      update: {},
      create: { key, value },
    });
  }
}

export const getSettings = async (_req: Request, res: Response) => {
  try {
    await upsertDefaults();
    const rows = await prisma.systemSetting.findMany();
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    return res.json({ success: true, data: { settings } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── PUT /api/admin/settings ───────────────────────────────────────────────────
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const updates = z.record(z.string()).parse(req.body);
    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      });
    }
    return res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/admin/referral-stats ─────────────────────────────────────────────
export const getReferralStats = async (_req: Request, res: Response) => {
  try {
    const [totalReferrals, totalRewardTxns] = await Promise.all([
      prisma.user.count({ where: { referredById: { not: null } } }),
      prisma.walletTransaction.aggregate({
        where:  { type: 'REFERRAL_REWARD' },
        _sum:   { amount: true },
        _count: { id: true },
      }),
    ]);

    const topReferrers = await prisma.user.findMany({
      where:    { referrals: { some: {} } },
      select:   { id: true, name: true, email: true, avatar: true, _count: { select: { referrals: true } } },
      orderBy:  { referrals: { _count: 'desc' } },
      take:     5,
    });

    return res.json({
      success: true,
      data: {
        totalReferrals,
        totalCreditsAwarded: totalRewardTxns._sum.amount ?? 0,
        totalRewardTxns:     totalRewardTxns._count.id,
        topReferrers,
      },
    });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
