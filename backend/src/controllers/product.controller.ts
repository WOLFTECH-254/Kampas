
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { getTopInterests } from '../lib/scoring.js';

const productInclude = { images: true, category: true, seller: { select: { id: true, name: true, campus: true, avatar: true } }, reviews: { select: { rating: true } } };

const avgRating = (reviews: { rating: number }[]) => reviews.length ? +(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

const format = (p: any) => ({ ...p, rating: avgRating(p.reviews), reviewCount: p.reviews.length, reviews: undefined });

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { campus, category, condition, minPrice, maxPrice, q, page = '1', limit = '20', sort = 'createdAt' } = req.query as Record<string, string>;
    const where: any = { isActive: true };
    if (campus)    where.campus    = { contains: campus };
    if (condition) where.condition = condition;
    if (q)         where.title     = { contains: q };
    if (minPrice || maxPrice) where.price = { ...(minPrice ? { gte: parseFloat(minPrice) } : {}), ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}) };
    if (category) { const cat = await prisma.category.findFirst({ where: { slug: category } }); if (cat) where.categoryId = cat.id; }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orderBy: any = sort === 'price_asc' ? { price: 'asc' } : sort === 'price_desc' ? { price: 'desc' } : sort === 'popular' ? { views: 'desc' } : { createdAt: 'desc' };
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude, orderBy, skip, take: parseInt(limit) }),
      prisma.product.count({ where }),
    ]);
    return res.json({ success: true, data: { products: products.map(format), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: { ...productInclude, reviews: { include: { reviewer: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' }, take: 10 } } });
    if (!product || !product.isActive) return res.status(404).json({ success: false, message: 'Product not found' });
    await prisma.product.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
    return res.json({ success: true, data: { product: format(product) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q) return res.status(400).json({ success: false, message: 'Search query required' });
    const products = await prisma.product.findMany({ where: { isActive: true, OR: [{ title: { contains: q } }, { description: { contains: q } }, { campus: { contains: q } }] }, include: productInclude, take: 20 });
    return res.json({ success: true, data: { products: products.map(format), query: q } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getTrending = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ where: { isActive: true }, include: productInclude, orderBy: { views: 'desc' }, take: 10 });
    return res.json({ success: true, data: { products: products.map(format) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getRecommended = async (req: AuthRequest, res: Response) => {
  try {
    const userId   = req.user!.id;
    const topCats  = await getTopInterests(userId, 5);

    let where: any = { isActive: true };

    if (topCats.length > 0) {
      const categories = await prisma.category.findMany({ where: { slug: { in: topCats } } });
      const catIds = categories.map(c => c.id);
      if (catIds.length > 0) where.categoryId = { in: catIds };
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { campus: true } });
      if (user?.campus) where.campus = user.campus;
    }

    const products = await prisma.product.findMany({
      where,
      include:  productInclude,
      orderBy:  { createdAt: 'desc' },
      take:     12,
    });

    return res.json({ success: true, data: { products: products.map(format), topCategories: topCats } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getInterests = async (req: AuthRequest, res: Response) => {
  try {
    const scores = await prisma.interestScore.findMany({
      where:   { userId: req.user!.id },
      orderBy: { score: 'desc' },
      take:    10,
    });
    return res.json({ success: true, data: { scores } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const reportProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { reason, details } = z.object({ reason: z.enum(['SCAM', 'FAKE', 'INAPPROPRIATE', 'OTHER']), details: z.string().optional() }).parse(req.body);
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await prisma.productReport.create({ data: { productId: req.params.id, userId: req.user!.id, reason, details } });
    return res.status(201).json({ success: true, message: 'Report submitted. Our team will review it.' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSearchSuggestions = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) return res.json({ success: true, data: { suggestions: [] } });
    const products = await prisma.product.findMany({ where: { isActive: true, title: { contains: q } }, select: { title: true, campus: true }, take: 8 });
    const suggestions = [...new Set(products.map(p => p.title))];
    return res.json({ success: true, data: { suggestions } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
