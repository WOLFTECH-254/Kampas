
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { campus, page = '1' } = req.query as Record<string, string>;
    const where: any = { isActive: true, startDate: { gte: new Date() } };
    if (campus) where.campus = { contains: campus };
    const skip = (parseInt(page) - 1) * 12;
    const [events, total] = await Promise.all([
      prisma.event.findMany({ where, include: { organizer: { select: { id: true, name: true, avatar: true } }, _count: { select: { rsvps: true, tickets: true } } }, orderBy: { startDate: 'asc' }, skip, take: 12 }),
      prisma.event.count({ where }),
    ]);
    return res.json({ success: true, data: { events, total, page: parseInt(page), pages: Math.ceil(total / 12) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getEvent = async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id }, include: { organizer: { select: { id: true, name: true, avatar: true } }, _count: { select: { rsvps: true, tickets: true } } } });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    return res.json({ success: true, data: { event } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const rsvpEvent = async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    const existing = await prisma.eventRSVP.findUnique({ where: { eventId_userId: { eventId: req.params.id, userId: req.user!.id } } });
    if (existing) {
      await prisma.eventRSVP.delete({ where: { id: existing.id } });
      return res.json({ success: true, message: 'RSVP cancelled' });
    }
    await prisma.eventRSVP.create({ data: { eventId: req.params.id, userId: req.user!.id } });
    return res.status(201).json({ success: true, message: `RSVP confirmed for ${event.title}` });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getMyTickets = async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await prisma.eventTicket.findMany({
      where: { userId: req.user!.id },
      include: { event: { select: { title: true, startDate: true, venue: true, campus: true, price: true, organizer: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: { tickets } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const buyTicket = async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event || !event.isActive) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.price > 0) {
      const buyer = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { walletBalance: true } });
      if (!buyer || buyer.walletBalance < event.price) return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      await prisma.user.update({ where: { id: req.user!.id }, data: { walletBalance: { decrement: event.price } } });
      const updated = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { walletBalance: true } });
      await prisma.walletTransaction.create({ data: { userId: req.user!.id, type: 'PAYMENT', amount: -event.price, balance: updated!.walletBalance, description: `Ticket for ${event.title}` } });
    }
    const qrCode = `KAMPAS-${event.id.slice(-6)}-${req.user!.id.slice(-6)}-${Date.now()}`.toUpperCase();
    const ticket = await prisma.eventTicket.create({ data: { eventId: req.params.id, userId: req.user!.id, qrCode } });
    return res.status(201).json({ success: true, message: 'Ticket purchased!', data: { ticket } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
