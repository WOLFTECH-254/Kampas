
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const userSelect = { id: true, name: true, avatar: true };

export const getCommunityMessages = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const messages = await prisma.communityMessage.findMany({
      include: { user: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 50,
      take: 50,
    });
    return res.json({ success: true, data: { messages: messages.reverse() } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const sendCommunityMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(1000) }).parse(req.body);
    const message = await prisma.communityMessage.create({
      data: { content, userId: req.user!.id },
      include: { user: { select: userSelect } },
    });
    return res.status(201).json({ success: true, data: { message } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Invalid content' });
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
