
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

export const getHousings = async (req: Request, res: Response) => {
  try {
    const { campus, minPrice, maxPrice, roomType, page = '1' } = req.query as Record<string, string>;
    const where: any = { isAvailable: true };
    if (campus)   where.campus   = { contains: campus };
    if (roomType) where.roomType = roomType;
    if (minPrice || maxPrice) where.price = { ...(minPrice ? { gte: parseFloat(minPrice) } : {}), ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}) };
    const skip = (parseInt(page) - 1) * 12;
    const [housings, total] = await Promise.all([
      prisma.housing.findMany({ where, include: { images: true, owner: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' }, skip, take: 12 }),
      prisma.housing.count({ where }),
    ]);
    return res.json({ success: true, data: { housings, total, page: parseInt(page), pages: Math.ceil(total / 12) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getHousing = async (req: Request, res: Response) => {
  try {
    const housing = await prisma.housing.findUnique({ where: { id: req.params.id }, include: { images: true, owner: { select: { id: true, name: true, avatar: true, phone: true } }, saves: true } });
    if (!housing) return res.status(404).json({ success: false, message: 'Housing not found' });
    return res.json({ success: true, data: { housing } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const saveHousing = async (req: AuthRequest, res: Response) => {
  try {
    const housing = await prisma.housing.findUnique({ where: { id: req.params.id } });
    if (!housing) return res.status(404).json({ success: false, message: 'Housing not found' });
    const existing = await prisma.housingSave.findUnique({ where: { userId_housingId: { userId: req.user!.id, housingId: req.params.id } } });
    if (existing) {
      await prisma.housingSave.delete({ where: { id: existing.id } });
      return res.json({ success: true, message: 'Housing unsaved' });
    }
    await prisma.housingSave.create({ data: { userId: req.user!.id, housingId: req.params.id } });
    return res.status(201).json({ success: true, message: 'Housing saved' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
