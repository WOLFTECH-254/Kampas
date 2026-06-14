
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const productSchema = z.object({
  listingType: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'),
  title:       z.string().min(2),
  description: z.string().optional(),
  price:       z.number().positive(),
  campus:      z.string().min(2),
  condition:   z.enum(['NEW', 'SLIGHTLY_USED', 'USED', 'THRIFTED']).default('NEW'),
  categoryId:  z.string().optional(),
  stock:       z.number().int().min(0).default(1),
  isActive:    z.boolean().default(true),
  isFeatured:  z.boolean().default(false),
  images:      z.array(z.object({ url: z.string().url(), isPrimary: z.boolean().default(false) })).optional(),
});

const productInclude = {
  images:   true,
  category: true,
  _count:   { select: { orderItems: true, wishlistItems: true, reviews: true } },
};

// GET /api/seller/products
export const getSellerProducts = async (req: AuthRequest, res: Response) => {
  try {
    const page      = parseInt(req.query.page as string) || 1;
    const limit     = parseInt(req.query.limit as string) || 20;
    const status    = req.query.status as string;
    const search    = req.query.q as string;
    const where: any = { sellerId: req.user!.id };
    if (status === 'active')   where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) where.title = { contains: search };
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where }),
    ]);
    return res.json({ success: true, data: { products, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// POST /api/seller/products
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    // KYC gate — seller must have approved KYC
    const kyc = await prisma.sellerVerification.findUnique({ where: { sellerId: req.user!.id } });
    if (!kyc || kyc.status !== 'APPROVED') {
      const status = !kyc ? 'not_submitted' : kyc.status.toLowerCase();
      return res.status(403).json({ success: false, kycRequired: true, kycStatus: status, message: 'KYC verification required before you can list products or services.' });
    }

    const { images, ...data } = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        ...data,
        sellerId: req.user!.id,
        ...(images ? { images: { create: images } } : {}),
      },
      include: productInclude,
    });
    return res.status(201).json({ success: true, message: 'Product created', data: { product } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/seller/products/:id
export const getSellerProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findFirst({
      where:   { id: req.params.id, sellerId: req.user!.id },
      include: { ...productInclude, reviews: { include: { reviewer: { select: { id: true, name: true, avatar: true } } }, take: 10 } },
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, data: { product } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// PUT /api/seller/products/:id
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    const { images, ...data } = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({
      where:   { id: req.params.id },
      data,
      include: productInclude,
    });
    return res.json({ success: true, message: 'Product updated', data: { product } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/seller/products/:id
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    return res.json({ success: true, message: 'Product removed from marketplace' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// PUT /api/seller/products/:id/stock
export const updateStock = async (req: AuthRequest, res: Response) => {
  try {
    const { stock } = z.object({ stock: z.number().int().min(0) }).parse(req.body);
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { stock, isActive: stock > 0 } });
    return res.json({ success: true, message: 'Stock updated', data: { stock: product.stock } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/seller/inventory
export const getInventory = async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where:   { sellerId: req.user!.id },
      select:  { id: true, title: true, stock: true, isActive: true, price: true, images: { take: 1 } },
      orderBy: { stock: 'asc' },
    });
    const lowStock  = products.filter(p => p.stock > 0 && p.stock <= 3);
    const outOfStock = products.filter(p => p.stock === 0);
    return res.json({ success: true, data: { products, lowStock: lowStock.length, outOfStock: outOfStock.length } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
