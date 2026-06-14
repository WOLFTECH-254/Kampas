
import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { trackEvent } from '../lib/scoring.js';

export const getWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.wishlistItem.findMany({ where: { userId: req.user!.id }, include: { product: { include: { images: true, seller: { select: { id: true, name: true, campus: true, avatar: true } } } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { items, total: items.length } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const addToWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: req.user!.id, productId: req.params.productId } } });
    if (existing) return res.status(409).json({ success: false, message: 'Already in wishlist' });
    await prisma.wishlistItem.create({ data: { userId: req.user!.id, productId: req.params.productId } });
    trackEvent(req.user!.id, 'WISHLIST_ADD', { productId: req.params.productId }).catch(() => {});
    return res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user!.id, productId: req.params.productId } });
    return res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
