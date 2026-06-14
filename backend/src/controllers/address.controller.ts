
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const addressSchema = z.object({
  label:                z.string().min(1),
  hostelName:           z.string().optional(),
  roomNumber:           z.string().optional(),
  campus:               z.string().optional(),
  latitude:             z.number().optional(),
  longitude:            z.number().optional(),
  deliveryInstructions: z.string().optional(),
  isDefault:            z.boolean().optional(),
});

export const getAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const addresses = await prisma.address.findMany({ where: { userId: req.user!.id }, orderBy: { isDefault: 'desc' } });
    return res.json({ success: true, data: { addresses } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const addAddress = async (req: AuthRequest, res: Response) => {
  try {
    const data = addressSchema.parse(req.body);
    if (data.isDefault) await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    const address = await prisma.address.create({ data: { ...data, userId: req.user!.id } });
    return res.status(201).json({ success: true, message: 'Address added', data: { address } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
  try {
    const data = addressSchema.partial().parse(req.body);
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Address not found' });
    if (data.isDefault) await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    const address = await prisma.address.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, message: 'Address updated', data: { address } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Address not found' });
    await prisma.address.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Address deleted' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
