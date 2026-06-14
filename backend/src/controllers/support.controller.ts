
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendEmail as _sendEmail } from '../lib/email.js';

// ── helpers ────────────────────────────────────────────────────────────────
async function notifyAdminNewTicket(ticket: any, user: any) {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true, name: true } });
    for (const admin of admins) {
      await ((_sendEmail as any)(
        admin.email,
        `[Support] New Ticket: ${ticket.subject}`,
        `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#ec4899;padding:24px 32px;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;background:#fff;border-radius:10px;font-size:20px;font-weight:900;color:#ec4899;text-align:center;line-height:36px;">K</div>
              <span style="color:#fff;font-size:20px;font-weight:800;">Kampas Support</span>
            </div>
          </div>
          <div style="padding:32px;background:#fff;">
            <h2 style="margin:0 0 16px;color:#111;">New Support Ticket</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <tr><td style="padding:8px;color:#666;font-size:13px;width:110px;">From</td><td style="padding:8px;font-weight:600;">${user.name} (${user.email})</td></tr>
              <tr style="background:#fdf2f8;"><td style="padding:8px;color:#666;font-size:13px;">Subject</td><td style="padding:8px;font-weight:600;">${ticket.subject}</td></tr>
              <tr><td style="padding:8px;color:#666;font-size:13px;">Category</td><td style="padding:8px;">${ticket.category}</td></tr>
              <tr style="background:#fdf2f8;"><td style="padding:8px;color:#666;font-size:13px;">Priority</td><td style="padding:8px;">${ticket.priority}</td></tr>
            </table>
            <div style="background:#fdf2f8;border-left:4px solid #ec4899;padding:16px;border-radius:4px;margin-bottom:24px;">
              <p style="margin:0;color:#333;">${ticket.messages?.[0]?.message || ''}</p>
            </div>
            <a href="${process.env.ADMIN_URL || 'https://kampas.co.ke/admin'}" style="display:inline-block;background:#ec4899;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">View in Admin Dashboard</a>
          </div>
        </div>
        `
      ));
    }
  } catch (e) { console.error('Admin notify failed', e); }
}

async function notifyUserReply(ticket: any, message: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { email: true, name: true } });
    if (!user) return;
    await ((_sendEmail as any)(
      user.email,
      `Re: ${ticket.subject} — Support Reply`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#ec4899;padding:24px 32px;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:#fff;border-radius:10px;font-size:20px;font-weight:900;color:#ec4899;text-align:center;line-height:36px;">K</div>
            <span style="color:#fff;font-size:20px;font-weight:800;">Kampas Support</span>
          </div>
        </div>
        <div style="padding:32px;background:#fff;">
          <h2 style="margin:0 0 8px;color:#111;">Hi ${user.name},</h2>
          <p style="color:#666;margin:0 0 20px;">Our support team has replied to your ticket: <strong>${ticket.subject}</strong></p>
          <div style="background:#fdf2f8;border-left:4px solid #ec4899;padding:16px;border-radius:4px;margin-bottom:24px;">
            <p style="margin:0;color:#333;">${message}</p>
          </div>
          <p style="color:#666;font-size:13px;">Log in to Kampas to continue the conversation and view your full ticket history.</p>
        </div>
      </div>
      `
    ));
  } catch (e) { console.error('User reply notify failed', e); }
}

// ── USER routes ────────────────────────────────────────────────────────────
export const createTicket = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { subject, category = 'GENERAL', priority = 'NORMAL', message } = req.body;
  if (!subject?.trim() || !message?.trim())
    return res.status(400).json({ success: false, message: 'Subject and message are required' });

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject: subject.trim(),
      category,
      priority,
      messages: { create: { senderId: user.id, senderRole: 'USER', message: message.trim() } },
    },
    include: { messages: true, user: { select: { name: true, email: true } } },
  });
  await notifyAdminNewTicket(ticket, user);
  res.json({ success: true, ticket });
};

export const getUserTickets = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  res.json({ success: true, tickets });
};

export const getUserTicket = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: req.params.id, userId: user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  res.json({ success: true, ticket });
};

export const sendUserMessage = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

  const ticket = await prisma.supportTicket.findFirst({ where: { id: req.params.id, userId: user.id } });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.status === 'CLOSED') return res.status(400).json({ success: false, message: 'Ticket is closed' });

  const msg = await prisma.supportMessage.create({
    data: { ticketId: ticket.id, senderId: user.id, senderRole: 'USER', message: message.trim() },
  });
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'IN_PROGRESS', updatedAt: new Date() } });
  res.json({ success: true, message: msg });
};

// ── ADMIN routes ───────────────────────────────────────────────────────────
export const adminGetTickets = async (req: Request, res: Response) => {
  const { status } = req.query;
  const where = status && status !== 'ALL' ? { status: String(status) } : {};
  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true, campus: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  res.json({ success: true, tickets });
};

export const adminGetTicket = async (req: Request, res: Response) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  res.json({ success: true, ticket });
};

export const adminReply = async (req: Request, res: Response) => {
  const admin = (req as any).user;
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  const msg = await prisma.supportMessage.create({
    data: { ticketId: ticket.id, senderId: admin.id, senderRole: 'ADMIN', message: message.trim() },
  });
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'IN_PROGRESS', updatedAt: new Date() } });
  await notifyUserReply(ticket, message.trim());
  res.json({ success: true, message: msg });
};

export const adminCloseTicket = async (req: Request, res: Response) => {
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { status: 'CLOSED' },
  });
  res.json({ success: true, ticket });
};
