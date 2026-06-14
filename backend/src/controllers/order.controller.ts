
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { trackEvent } from '../lib/scoring.js';

const placeOrderSchema = z.object({
  addressId:     z.string().optional(),
  paymentMethod: z.enum(['WALLET', 'MPESA']).default('WALLET'),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
});

const refundSchema = z.object({
  reason: z.string().min(5, 'Reason too short'),
});

const disputeSchema = z.object({
  reason:      z.string().min(5),
  description: z.string().optional(),
});

const reviewSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// POST /api/buyer/orders
export const placeOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, addressId, paymentMethod } = placeOrderSchema.parse(req.body);
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } });
    if (products.length !== productIds.length) return res.status(400).json({ success: false, message: 'One or more products unavailable' });

    // Group by seller (one order per seller)
    const bySeller: Record<string, typeof items> = {};
    for (const item of items) {
      const product = products.find(p => p.id === item.productId)!;
      if (!bySeller[product.sellerId]) bySeller[product.sellerId] = [];
      bySeller[product.sellerId].push(item);
    }

    const DELIVERY_FEE = 100;
    const orders = [];

    for (const [sellerId, sellerItems] of Object.entries(bySeller)) {
      const subtotal = sellerItems.reduce((s, i) => {
        const p = products.find(p => p.id === i.productId)!;
        return s + p.price * i.quantity;
      }, 0);
      const total = subtotal + DELIVERY_FEE;

      if (paymentMethod === 'WALLET') {
        const buyer = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { walletBalance: true } });
        if (!buyer || buyer.walletBalance < total) return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        await prisma.user.update({ where: { id: req.user!.id }, data: { walletBalance: { decrement: total } } });
      }

      const order = await prisma.order.create({
        data: {
          buyerId: req.user!.id, sellerId, addressId, total, deliveryFee: DELIVERY_FEE,
          paymentMethod, paymentStatus: paymentMethod === 'WALLET' ? 'PAID' : 'PENDING',
          items: { create: sellerItems.map(i => ({ productId: i.productId, quantity: i.quantity, price: products.find(p => p.id === i.productId)!.price })) },
          trackingInfo: { create: { status: 'PENDING', note: 'Order placed' } },
        },
        include: { items: { include: { product: true } }, trackingInfo: true },
      });

      if (paymentMethod === 'WALLET') {
        const updated = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { walletBalance: true } });
        await prisma.walletTransaction.create({
          data: { userId: req.user!.id, type: 'PAYMENT', amount: -total, balance: updated!.walletBalance, description: `Payment for order #${order.id.slice(-6).toUpperCase()}` },
        });
      }

      await prisma.notification.create({
        data: { userId: req.user!.id, type: 'ORDER', title: 'Order Placed!', body: `Your order #${order.id.slice(-6).toUpperCase()} has been placed.` },
      });

      orders.push(order);

      for (const item of sellerItems) {
        trackEvent(req.user!.id, 'PURCHASE', { productId: item.productId }).catch(() => {});
      }
    }

    return res.status(201).json({ success: true, message: 'Order placed successfully', data: { orders } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/buyer/orders
export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const page   = parseInt(req.query.page as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;
    const where  = { buyerId: req.user!.id, ...(status ? { status } : {}) };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: { include: { product: { include: { images: true } } } }, address: true, trackingInfo: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.order.count({ where }),
    ]);
    return res.json({ success: true, data: { orders, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/buyer/orders/:id
export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, buyerId: req.user!.id },
      include: { items: { include: { product: { include: { images: true } } } }, address: true, trackingInfo: { orderBy: { createdAt: 'desc' } }, refund: true, dispute: true, review: true },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: { order } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// PUT /api/buyer/orders/:id/cancel
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, buyerId: req.user!.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    await prisma.orderTracking.create({ data: { orderId: order.id, status: 'CANCELLED', note: 'Order cancelled by buyer' } });
    if (order.paymentStatus === 'PAID') {
      await prisma.user.update({ where: { id: req.user!.id }, data: { walletBalance: { increment: order.total } } });
      const updated = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { walletBalance: true } });
      await prisma.walletTransaction.create({ data: { userId: req.user!.id, type: 'REFUND', amount: order.total, balance: updated!.walletBalance, description: `Refund for cancelled order #${order.id.slice(-6).toUpperCase()}` } });
    }
    return res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/buyer/orders/:id/tracking
export const trackOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, buyerId: req.user!.id }, include: { trackingInfo: { orderBy: { createdAt: 'asc' } } } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: { status: order.status, timeline: order.trackingInfo } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// POST /api/buyer/orders/:id/review
export const reviewOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { rating, comment } = reviewSchema.parse(req.body);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, buyerId: req.user!.id, status: 'DELIVERED' }, include: { items: true } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found or not yet delivered' });
    const existing = await prisma.review.findUnique({ where: { orderId: order.id } });
    if (existing) return res.status(409).json({ success: false, message: 'You already reviewed this order' });
    const productId = order.items[0]?.productId;
    const review = await prisma.review.create({ data: { orderId: order.id, reviewerId: req.user!.id, sellerId: order.sellerId, productId, rating, comment } });
    return res.status(201).json({ success: true, message: 'Review submitted', data: { review } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/buyer/orders/:id/refund
export const requestRefund = async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = refundSchema.parse(req.body);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, buyerId: req.user!.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['DELIVERED', 'CANCELLED'].includes(order.status)) return res.status(400).json({ success: false, message: 'Refund not applicable for this order status' });
    const existing = await prisma.refund.findUnique({ where: { orderId: order.id } });
    if (existing) return res.status(409).json({ success: false, message: 'Refund already requested' });
    const refund = await prisma.refund.create({ data: { orderId: order.id, userId: req.user!.id, reason, amount: order.total } });
    return res.status(201).json({ success: true, message: 'Refund requested successfully', data: { refund } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/buyer/refunds
export const getRefunds = async (req: AuthRequest, res: Response) => {
  try {
    const refunds = await prisma.refund.findMany({ where: { userId: req.user!.id }, include: { order: true }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { refunds } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// POST /api/buyer/orders/:id/dispute
export const raiseDispute = async (req: AuthRequest, res: Response) => {
  try {
    const { reason, description } = disputeSchema.parse(req.body);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, buyerId: req.user!.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const existing = await prisma.dispute.findUnique({ where: { orderId: order.id } });
    if (existing) return res.status(409).json({ success: false, message: 'Dispute already raised for this order' });
    const dispute = await prisma.dispute.create({ data: { orderId: order.id, raisedById: req.user!.id, reason, description } });
    return res.status(201).json({ success: true, message: 'Dispute raised successfully', data: { dispute } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/buyer/disputes
export const getDisputes = async (req: AuthRequest, res: Response) => {
  try {
    const disputes = await prisma.dispute.findMany({ where: { raisedById: req.user!.id }, include: { order: true, evidence: true }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { disputes } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
