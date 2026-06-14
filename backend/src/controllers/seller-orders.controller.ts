
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const ORDER_STATUSES = ['PENDING','CONFIRMED','PROCESSING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'];

const orderInclude = {
  items:       { include: { product: { include: { images: true } } } },
  buyer:       { select: { id: true, name: true, email: true, phone: true, avatar: true, campus: true } },
  address:     true,
  trackingInfo: { orderBy: { createdAt: 'desc' as const } },
};

// GET /api/seller/orders
export const getSellerOrders = async (req: AuthRequest, res: Response) => {
  try {
    const page   = parseInt(req.query.page as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const where: any = { sellerId: req.user!.id };
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.order.count({ where }),
    ]);
    return res.json({ success: true, data: { orders, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/seller/orders/:id
export const getSellerOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, sellerId: req.user!.id }, include: { ...orderInclude, refund: true, dispute: true, review: true } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: { order } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// PUT /api/seller/orders/:id/status
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, note } = z.object({ status: z.enum(ORDER_STATUSES as [string, ...string[]]), note: z.string().optional() }).parse(req.body);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await prisma.order.update({ where: { id: order.id }, data: { status } });
    await prisma.orderTracking.create({ data: { orderId: order.id, status, note: note || `Order ${status.toLowerCase().replace(/_/g, ' ')}` } });

    // Credit seller when order delivered
    if (status === 'DELIVERED') {
      const platformFee = order.total * 0.05;
      const sellerEarning = order.total - platformFee;
      const updatedSeller = await prisma.user.update({ where: { id: req.user!.id }, data: { sellerBalance: { increment: sellerEarning } }, select: { sellerBalance: true } });
      await prisma.walletTransaction.create({
        data: { userId: req.user!.id, type: 'EARNING', amount: sellerEarning, balance: updatedSeller.sellerBalance, description: `Earning from order #${order.id.slice(-6).toUpperCase()} (5% platform fee deducted)` },
      });
    }

    // Notify buyer
    await prisma.notification.create({ data: { userId: order.buyerId, type: 'ORDER', title: 'Order Update', body: `Your order #${order.id.slice(-6).toUpperCase()} is now ${status.replace(/_/g, ' ')}` } });

    return res.json({ success: true, message: `Order marked as ${status}` });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/seller/orders/:id/cancel
export const cancelSellerOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (['DELIVERED', 'CANCELLED'].includes(order.status)) return res.status(400).json({ success: false, message: 'Cannot cancel this order' });

    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    await prisma.orderTracking.create({ data: { orderId: order.id, status: 'CANCELLED', note: `Cancelled by seller: ${reason}` } });

    // Refund buyer
    if (order.paymentStatus === 'PAID') {
      const updated = await prisma.user.update({ where: { id: order.buyerId }, data: { walletBalance: { increment: order.total } }, select: { walletBalance: true } });
      await prisma.walletTransaction.create({ data: { userId: order.buyerId, type: 'REFUND', amount: order.total, balance: updated.walletBalance, description: `Refund for cancelled order #${order.id.slice(-6).toUpperCase()}` } });
      await prisma.notification.create({ data: { userId: order.buyerId, type: 'ORDER', title: 'Order Cancelled', body: `Your order #${order.id.slice(-6).toUpperCase()} was cancelled. KSH ${order.total.toLocaleString()} refunded to your wallet.` } });
    }
    return res.json({ success: true, message: 'Order cancelled and buyer refunded' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/seller/orders/:id/note
export const addOrderNote = async (req: AuthRequest, res: Response) => {
  try {
    const { note } = z.object({ note: z.string().min(1) }).parse(req.body);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    await prisma.orderTracking.create({ data: { orderId: order.id, status: order.status, note } });
    return res.json({ success: true, message: 'Note added' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/seller/refunds
export const getSellerRefunds = async (req: AuthRequest, res: Response) => {
  try {
    const refunds = await prisma.refund.findMany({ where: { order: { sellerId: req.user!.id } }, include: { order: true, user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { refunds } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/seller/disputes
export const getSellerDisputes = async (req: AuthRequest, res: Response) => {
  try {
    const disputes = await prisma.dispute.findMany({ where: { order: { sellerId: req.user!.id } }, include: { order: true, raisedBy: { select: { id: true, name: true, email: true } }, evidence: true }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { disputes } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// POST /api/seller/disputes/:id/respond
export const respondToDispute = async (req: AuthRequest, res: Response) => {
  try {
    const { response } = z.object({ response: z.string().min(10) }).parse(req.body);
    const dispute = await prisma.dispute.findFirst({ where: { id: req.params.id, order: { sellerId: req.user!.id } } });
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });
    await prisma.dispute.update({ where: { id: dispute.id }, data: { resolution: response, status: 'UNDER_REVIEW' } });
    return res.json({ success: true, message: 'Response submitted' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
