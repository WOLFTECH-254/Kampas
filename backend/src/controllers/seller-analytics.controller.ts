
import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

// GET /api/seller/analytics
export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.id;
    const now      = new Date();
    const month    = new Date(now.getFullYear(), now.getMonth(), 1);
    const week     = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalRevenue, monthRevenue, weekRevenue,
      totalOrders, pendingOrders, deliveredOrders,
      totalProducts, activeProducts,
      totalCustomers,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.order.aggregate({ where: { sellerId, status: 'DELIVERED' }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { sellerId, status: 'DELIVERED', createdAt: { gte: month } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { sellerId, status: 'DELIVERED', createdAt: { gte: week } }, _sum: { total: true } }),
      prisma.order.count({ where: { sellerId } }),
      prisma.order.count({ where: { sellerId, status: 'PENDING' } }),
      prisma.order.count({ where: { sellerId, status: 'DELIVERED' } }),
      prisma.product.count({ where: { sellerId } }),
      prisma.product.count({ where: { sellerId, isActive: true } }),
      prisma.order.findMany({ where: { sellerId }, distinct: ['buyerId'], select: { buyerId: true } }).then(r => r.length),
      prisma.orderItem.groupBy({ by: ['productId'], where: { order: { sellerId, status: 'DELIVERED' } }, _sum: { quantity: true, price: true }, orderBy: { _sum: { price: 'desc' } }, take: 5 }),
      prisma.order.findMany({ where: { sellerId }, include: { buyer: { select: { name: true, avatar: true } }, items: { include: { product: { select: { title: true } } } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    // Enrich top products
    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({ where: { id: { in: topProductIds } }, include: { images: { take: 1 } } });
    const enrichedTopProducts = topProducts.map(tp => ({
      ...tp,
      product: productDetails.find(p => p.id === tp.productId),
    }));

    return res.json({
      success: true,
      data: {
        revenue:  { total: totalRevenue._sum.total ?? 0, month: monthRevenue._sum.total ?? 0, week: weekRevenue._sum.total ?? 0 },
        orders:   { total: totalOrders, pending: pendingOrders, delivered: deliveredOrders },
        products: { total: totalProducts, active: activeProducts },
        customers: totalCustomers,
        topProducts: enrichedTopProducts,
        recentOrders,
      },
    });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/seller/analytics/sales
export const getSalesAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const days    = parseInt(req.query.days as string) || 30;
    const from    = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders  = await prisma.order.findMany({
      where:   { sellerId: req.user!.id, status: 'DELIVERED', createdAt: { gte: from } },
      select:  { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const byDate: Record<string, number> = {};
    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + order.total;
    }

    const salesData = Object.entries(byDate).map(([date, revenue]) => ({ date, revenue }));
    return res.json({ success: true, data: { salesData, period: days } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/seller/reviews
export const getSellerReviews = async (req: AuthRequest, res: Response) => {
  try {
    const [reviews, stats] = await Promise.all([
      prisma.review.findMany({
        where:   { sellerId: req.user!.id },
        include: { reviewer: { select: { id: true, name: true, avatar: true } }, product: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.aggregate({ where: { sellerId: req.user!.id }, _avg: { rating: true }, _count: true }),
    ]);
    return res.json({ success: true, data: { reviews, avgRating: stats._avg.rating?.toFixed(1), total: stats._count } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
