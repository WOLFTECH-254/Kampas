
import type { Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const PAYSTACK_BASE = 'https://api.paystack.co';
const paystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
});

const topupSchema = z.object({
  amount: z.number().min(10, 'Minimum top-up is KSH 10'),
  phone:  z.string().min(10, 'Enter a valid phone number'),
});


// ── POST /api/buyer/wallet/topup/mpesa ───────────────────────────────────────
// Direct M-Pesa STK push — no popup, our own UI
export const initiateMpesaTopup = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, phone } = z.object({
      amount: z.number().min(10, 'Minimum is KSH 10'),
      phone:  z.string().min(10, 'Enter a valid phone number'),
    }).parse(req.body);

    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { email: true, name: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Keep 07XXXXXXXXX format — strip spaces/dashes only
    let normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    // Ensure it starts with 07 or 01
    if (normalizedPhone.startsWith('+254')) normalizedPhone = '0' + normalizedPhone.slice(4);
    else if (normalizedPhone.startsWith('254')) normalizedPhone = '0' + normalizedPhone.slice(3);
    if (!/^0[17]\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid Kenyan number e.g. 0712345678' });
    }

    console.log('STK Push → phone:', normalizedPhone, 'amount:', amount);

    const paystackRes = await axios.post(
      `${PAYSTACK_BASE}/charge`,
      {
        amount:       Math.round(amount * 100),
        email:        user.email,
        currency:     'KES',
        mobile_money: { phone: normalizedPhone, provider: 'mpesa' },
        metadata:     { userId: req.user!.id, type: 'WALLET_TOPUP', amount },
      },
      { headers: paystackHeaders() }
    );

    const charge = paystackRes.data.data;
    console.log('Paystack STK response:', JSON.stringify(charge, null, 2));

    await prisma.walletTransaction.create({
      data: {
        userId:      req.user!.id,
        type:        'TOPUP',
        amount:      0,
        balance:     0,
        reference:   charge.reference,
        description: `M-Pesa top-up of KSH ${amount} from ${normalizedPhone}`,
        status:      'PENDING',
      },
    });

    return res.json({
      success: true,
      message: 'STK push sent! Enter your M-Pesa PIN on your phone.',
      data:    { reference: charge.reference, status: charge.status },
    });
  } catch (err: any) {
    console.error('STK Push error:', err?.response?.data || err.message);
    const msg = err?.response?.data?.message || err.message || 'Failed to send STK push';
    return res.status(500).json({ success: false, message: msg });
  }
};

// ── POST /api/buyer/wallet/topup/card ────────────────────────────────────────
// Initialize Paystack transaction for card popup
export const initiateCardTopup = async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = z.object({ amount: z.number().min(10) }).parse(req.body);

    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { email: true, name: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const paystackRes = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email:        user.email,
        amount:       Math.round(amount * 100),
        currency:     'KES',
        channels:     ['card'], // card only
        callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/payment/callback`,
        metadata:     { userId: req.user!.id, type: 'WALLET_TOPUP', amount },
      },
      { headers: paystackHeaders() }
    );

    const { access_code, reference } = paystackRes.data.data;

    await prisma.walletTransaction.create({
      data: {
        userId:      req.user!.id,
        type:        'TOPUP',
        amount:      0,
        balance:     0,
        reference,
        description: `Card top-up of KSH ${amount}`,
        status:      'PENDING',
      },
    });

    return res.json({
      success: true,
      message: 'Card payment initialized',
      data:    { access_code, reference, amount },
    });
  } catch (err: any) {
    console.error('Card topup error:', err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: err?.response?.data?.message || 'Failed to initialize card payment' });
  }
};



// ── POST /api/buyer/wallet/topup/verify ───────────────────────────────────────
// Frontend polls this after STK push to confirm payment
export const verifyMpesaTopup = async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = z.object({ reference: z.string() }).parse(req.body);

    // Check if already processed
    const existingTx = await prisma.walletTransaction.findFirst({
      where: { reference, userId: req.user!.id },
    });

    if (!existingTx) {
      return res.status(404).json({ success: false, message: 'Payment transaction not found' });
    }

    if (existingTx?.status === 'COMPLETED') {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { walletBalance: true } });
      return res.json({
        success: true,
        message: 'Payment already confirmed!',
        data:    { status: 'success', balance: user?.walletBalance },
      });
    }

    // Verify with Paystack
    const verifyRes = await axios.get(
      `${PAYSTACK_BASE}/transaction/verify/${reference}`,
      { headers: paystackHeaders() }
    );

    const tx     = verifyRes.data.data;
    const status = tx.status; // 'success' | 'failed' | 'pending' | 'abandoned'

    console.log('Paystack verify status:', status, 'reference:', reference);

    if (status === 'success') {
      const paidAmount = tx.amount / 100; // convert from kobo back to KES

      if (tx.metadata?.userId !== req.user!.id || tx.metadata?.type !== 'WALLET_TOPUP') {
        return res.status(400).json({ success: false, message: 'Payment does not belong to this wallet' });
      }

      const updatedUser = await prisma.$transaction(async db => {
        const claimed = await db.walletTransaction.updateMany({ where: { id: existingTx.id, status: 'PENDING' }, data: { status: 'PROCESSING' } });
        if (claimed.count !== 1) return null;
        const user = await db.user.update({ where: { id: req.user!.id }, data: { walletBalance: { increment: paidAmount } }, select: { walletBalance: true } });
        await db.walletTransaction.update({ where: { id: existingTx.id }, data: { amount: paidAmount, balance: user.walletBalance, status: 'COMPLETED', description: `M-Pesa top-up of KSH ${paidAmount} (ref: ${reference})` } });
        return user;
      });
      if (!updatedUser) return res.json({ success: true, message: 'Payment is already being processed.', data: { status: 'pending' } });

      // Send notification
      await prisma.notification.create({
        data: {
          userId: req.user!.id,
          type:   'SYSTEM',
          title:  '💰 Wallet Topped Up!',
          body:   `KSH ${paidAmount.toLocaleString()} added to your Kampas wallet via M-Pesa. New balance: KSH ${updatedUser.walletBalance.toLocaleString()}`,
        },
      });

      return res.json({
        success: true,
        message: `KSH ${paidAmount.toLocaleString()} added to your wallet!`,
        data:    { status: 'success', amount: paidAmount, balance: updatedUser.walletBalance },
      });
    }

    if (status === 'failed' || status === 'abandoned') {
      await prisma.walletTransaction.updateMany({
        where: { reference, userId: req.user!.id },
        data:  { status: 'FAILED' },
      });
      return res.json({
        success: false,
        message: status === 'abandoned' ? 'Payment was cancelled or timed out.' : 'Payment failed. Please try again.',
        data:    { status },
      });
    }

    // Still pending
    return res.json({
      success: true,
      message: 'Waiting for M-Pesa confirmation...',
      data:    { status: 'pending' },
    });
  } catch (err: any) {
    console.error('Verify topup error:', err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
};

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// Paystack sends this when payment is confirmed (set in Paystack dashboard)
export const paystackWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const event = req.body;
    console.log('Paystack webhook:', event.event, event.data?.reference);

    if (event.event === 'charge.success') {
      const { reference, amount, metadata } = event.data;
      const userId   = metadata?.userId;
      const paidKES  = amount / 100;

      if (!userId) return res.sendStatus(200);

      if (metadata?.type !== 'WALLET_TOPUP') return res.sendStatus(200);
      const transaction = await prisma.walletTransaction.findFirst({ where: { reference, userId } });
      if (!transaction) return res.sendStatus(200);
      const updatedUser = await prisma.$transaction(async db => {
        const claimed = await db.walletTransaction.updateMany({ where: { id: transaction.id, status: 'PENDING' }, data: { status: 'PROCESSING' } });
        if (claimed.count !== 1) return null;
        const user = await db.user.update({ where: { id: userId }, data: { walletBalance: { increment: paidKES } }, select: { walletBalance: true } });
        await db.walletTransaction.update({ where: { id: transaction.id }, data: { amount: paidKES, balance: user.walletBalance, status: 'COMPLETED' } });
        return user;
      });
      if (!updatedUser) return res.sendStatus(200);

      await prisma.notification.create({
        data: {
          userId,
          type:  'SYSTEM',
          title: '💰 Wallet Topped Up!',
          body:  `KSH ${paidKES.toLocaleString()} added to your wallet. New balance: KSH ${updatedUser.walletBalance.toLocaleString()}`,
        },
      });
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    return res.sendStatus(200); // Always return 200 to Paystack
  }
};

// ── GET /api/buyer/wallet/transactions ────────────────────────────────────────
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const page  = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [transactions, total, user] = await Promise.all([
      prisma.walletTransaction.findMany({
        where:   { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.walletTransaction.count({ where: { userId: req.user!.id } }),
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { walletBalance: true } }),
    ]);

    return res.json({
      success: true,
      data: {
        transactions,
        total,
        page,
        pages:   Math.ceil(total / limit),
        balance: user?.walletBalance ?? 0,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Payment Methods (saved cards / M-Pesa numbers) ───────────────────────────
const pmSchema = z.object({
  type:      z.enum(['MPESA', 'CARD']),
  label:     z.string().optional(),
  phone:     z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const getPaymentMethods = async (req: AuthRequest, res: Response) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where:   { userId: req.user!.id },
      orderBy: { isDefault: 'desc' },
    });
    return res.json({ success: true, data: { methods } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addPaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const data = pmSchema.parse(req.body);
    if (data.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: req.user!.id },
        data:  { isDefault: false },
      });
    }
    const method = await prisma.paymentMethod.create({
      data: { ...data, userId: req.user!.id },
    });
    return res.status(201).json({ success: true, message: 'Payment method added', data: { method } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.paymentMethod.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    await prisma.paymentMethod.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Payment method removed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
