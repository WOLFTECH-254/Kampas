
import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { trackEvent } from '../lib/scoring.js';

export const getFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const following = await prisma.follow.findMany({ where: { followerId: req.user!.id }, include: { seller: { select: { id: true, name: true, campus: true, avatar: true } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { following, total: following.length } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const followSeller = async (req: AuthRequest, res: Response) => {
  try {
    const seller = await prisma.user.findFirst({ where: { id: req.params.sellerId, role: 'SELLER' } });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    if (req.params.sellerId === req.user!.id) return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    const existing = await prisma.follow.findUnique({ where: { followerId_sellerId: { followerId: req.user!.id, sellerId: req.params.sellerId } } });
    if (existing) return res.status(409).json({ success: false, message: 'Already following this seller' });
    await prisma.follow.create({ data: { followerId: req.user!.id, sellerId: req.params.sellerId } });
    trackEvent(req.user!.id, 'FOLLOW_SELLER', { sellerId: req.params.sellerId }).catch(() => {});
    return res.status(201).json({ success: true, message: `Now following ${seller.name}` });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const unfollowSeller = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.follow.deleteMany({ where: { followerId: req.user!.id, sellerId: req.params.sellerId } });
    return res.json({ success: true, message: 'Unfollowed successfully' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getActivity = async (req: AuthRequest, res: Response) => {
  try {
    const activity = await prisma.activityLog.findMany({ where: { userId: req.user!.id }, include: { product: { select: { id: true, title: true, images: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
    return res.json({ success: true, data: { activity } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const logActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { type, productId, query, metadata } = req.body;
    await prisma.activityLog.create({ data: { userId: req.user!.id, type, productId, query, metadata: metadata ? JSON.stringify(metadata) : undefined } });
    if (type === 'VIEW' && productId) {
      trackEvent(req.user!.id, 'VIEW', { productId }).catch(() => {});
    } else if (type === 'SEARCH' && metadata?.categorySlug) {
      trackEvent(req.user!.id, 'SEARCH', { categorySlug: metadata.categorySlug }).catch(() => {});
    }
    return res.status(201).json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getMyReviews = async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({ where: { reviewerId: req.user!.id }, include: { product: { select: { id: true, title: true, images: true } }, seller: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { reviews } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
