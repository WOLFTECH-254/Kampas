
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const adSchema = z.object({
  title:        z.string().min(2),
  description:  z.string().optional(),
  image:        z.string().optional(),
  productId:    z.string().optional(),
  targetCampus: z.string().optional(),
  budget:       z.number().positive(),
  startDate:    z.string().optional(),
  endDate:      z.string().optional(),
});

const promoSchema = z.object({
  code:      z.string().min(3).toUpperCase(),
  type:      z.enum(['PERCENTAGE', 'FIXED']),
  value:     z.number().positive(),
  minOrder:  z.number().default(0),
  maxUses:   z.number().optional(),
  expiresAt: z.string().optional(),
});

// ── ADS ──────────────────────────────────────────────────────────────────────
export const getAds = async (req: AuthRequest, res: Response) => {
  try {
    const ads = await prisma.ad.findMany({ where: { sellerId: req.user!.id }, include: { product: { select: { title: true, images: true } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { ads } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const createAd = async (req: AuthRequest, res: Response) => {
  try {
    const data = adSchema.parse(req.body);
    const seller = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerBalance: true } });
    if (!seller || seller.sellerBalance < data.budget) return res.status(400).json({ success: false, message: 'Insufficient balance for ad budget' });
    const ad = await prisma.ad.create({ data: { ...data, sellerId: req.user!.id, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined } });
    return res.status(201).json({ success: true, message: 'Ad created. Pending admin approval.', data: { ad } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateAd = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.ad.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Ad not found' });
    const data = adSchema.partial().parse(req.body);
    const ad = await prisma.ad.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, message: 'Ad updated', data: { ad } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteAd = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.ad.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Ad not found' });
    await prisma.ad.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Ad deleted' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getAdAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const ads = await prisma.ad.findMany({ where: { sellerId: req.user!.id }, select: { id: true, title: true, impressions: true, clicks: true, spent: true, budget: true, status: true } });
    const totals = ads.reduce((acc, ad) => ({ impressions: acc.impressions + ad.impressions, clicks: acc.clicks + ad.clicks, spent: acc.spent + ad.spent }), { impressions: 0, clicks: 0, spent: 0 });
    const ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';
    return res.json({ success: true, data: { ads, totals: { ...totals, ctr } } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PROMOTIONS ────────────────────────────────────────────────────────────────
export const getPromotions = async (req: AuthRequest, res: Response) => {
  try {
    const promotions = await prisma.promotion.findMany({ where: { sellerId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { promotions } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const createPromotion = async (req: AuthRequest, res: Response) => {
  try {
    const data = promoSchema.parse(req.body);
    const promotion = await prisma.promotion.create({ data: { ...data, sellerId: req.user!.id, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined } });
    return res.status(201).json({ success: true, message: 'Promotion created', data: { promotion } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updatePromotion = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.promotion.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Promotion not found' });
    const data = promoSchema.partial().parse(req.body);
    const promotion = await prisma.promotion.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, message: 'Promotion updated', data: { promotion } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deletePromotion = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.promotion.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Promotion not found' });
    await prisma.promotion.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Promotion deleted' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── DELIVERY ZONES ────────────────────────────────────────────────────────────
export const getDeliveryZones = async (req: AuthRequest, res: Response) => {
  try {
    const zones = await prisma.deliveryZone.findMany({ where: { sellerId: req.user!.id }, orderBy: { campus: 'asc' } });
    return res.json({ success: true, data: { zones } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const createDeliveryZone = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({ name: z.string().min(2), campus: z.string().min(2), fee: z.number().min(0), minOrder: z.number().min(0).default(0) }).parse(req.body);
    const zone = await prisma.deliveryZone.create({ data: { ...data, sellerId: req.user!.id } });
    return res.status(201).json({ success: true, message: 'Delivery zone added', data: { zone } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateDeliveryZone = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.deliveryZone.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Zone not found' });
    const data = z.object({ name: z.string().optional(), campus: z.string().optional(), fee: z.number().optional(), minOrder: z.number().optional(), isActive: z.boolean().optional() }).parse(req.body);
    const zone = await prisma.deliveryZone.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, message: 'Zone updated', data: { zone } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteDeliveryZone = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.deliveryZone.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Zone not found' });
    await prisma.deliveryZone.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Zone deleted' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
