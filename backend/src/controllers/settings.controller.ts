
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.buyerSettings.findUnique({ where: { userId: req.user!.id } });
    if (!settings) settings = await prisma.buyerSettings.create({ data: { userId: req.user!.id } });
    return res.json({ success: true, data: { settings } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({ darkMode: z.boolean().optional(), language: z.string().optional(), privacy: z.enum(['PUBLIC', 'PRIVATE']).optional() }).parse(req.body);
    const settings = await prisma.buyerSettings.upsert({ where: { userId: req.user!.id }, update: data, create: { userId: req.user!.id, ...data } });
    return res.json({ success: true, message: 'Settings updated', data: { settings } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
