
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);
    return res.json({ success: true, data: { notifications, unread } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { isRead: true } });
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getNotificationPrefs = async (req: AuthRequest, res: Response) => {
  try {
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.user!.id } });
    if (!prefs) prefs = await prisma.notificationPreference.create({ data: { userId: req.user!.id } });
    return res.json({ success: true, data: { prefs } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const updateNotificationPrefs = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({ orders: z.boolean().optional(), chats: z.boolean().optional(), marketing: z.boolean().optional(), events: z.boolean().optional(), housing: z.boolean().optional() }).parse(req.body);
    const prefs = await prisma.notificationPreference.upsert({ where: { userId: req.user!.id }, update: data, create: { userId: req.user!.id, ...data } });
    return res.json({ success: true, message: 'Preferences updated', data: { prefs } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
