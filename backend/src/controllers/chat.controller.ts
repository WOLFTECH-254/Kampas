
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

export const getChats = async (req: AuthRequest, res: Response) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }] },
      include: { buyer: { select: { id: true, name: true, avatar: true } }, seller: { select: { id: true, name: true, avatar: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: { chats } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const startChat = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.sellerId;
    if (targetId === req.user!.id) return res.status(400).json({ success: false, message: 'Cannot chat with yourself' });
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    const userSelect = { id: true, name: true, avatar: true };
    const existing = await prisma.chat.findFirst({
      where: { OR: [{ buyerId: req.user!.id, sellerId: targetId }, { buyerId: targetId, sellerId: req.user!.id }] },
      include: { buyer: { select: userSelect }, seller: { select: userSelect } },
    });
    if (existing) return res.json({ success: true, data: { chat: existing } });
    const chat = await prisma.chat.create({
      data: { buyerId: req.user!.id, sellerId: targetId },
      include: { buyer: { select: userSelect }, seller: { select: userSelect } },
    });
    return res.json({ success: true, data: { chat } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const chat = await prisma.chat.findFirst({ where: { id: req.params.chatId, OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }] } });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    const page = parseInt(req.query.page as string) || 1;
    const messages = await prisma.message.findMany({ where: { chatId: chat.id }, include: { sender: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 30, take: 30 });
    await prisma.message.updateMany({ where: { chatId: chat.id, senderId: { not: req.user!.id }, isRead: false }, data: { isRead: true } });
    return res.json({ success: true, data: { messages: messages.reverse(), page } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { content, type = 'TEXT' } = z.object({ content: z.string().min(1), type: z.enum(['TEXT', 'IMAGE', 'FILE']).optional() }).parse(req.body);
    const chat = await prisma.chat.findFirst({ where: { id: req.params.chatId, OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }] } });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    const message = await prisma.message.create({ data: { chatId: chat.id, senderId: req.user!.id, content, type }, include: { sender: { select: { id: true, name: true, avatar: true } } } });
    await prisma.chat.update({ where: { id: chat.id }, data: { lastMessage: content } });
    return res.status(201).json({ success: true, data: { message } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
