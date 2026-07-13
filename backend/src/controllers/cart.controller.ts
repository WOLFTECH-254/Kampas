
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { trackEvent } from '../lib/scoring.js';

const DELIVERY_FEE = 100;

const getOrCreateCart = async (userId: string) => {
  let cart = await prisma.cart.findUnique({ where: { userId }, include: { items: { include: { product: { include: { images: true } } } } } });
  if (!cart) cart = await prisma.cart.create({ data: { userId }, include: { items: { include: { product: { include: { images: true } } } } } });
  return cart;
};

const calcTotals = (items: any[]) => {
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
};

// GET /api/buyer/cart
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const cart = await getOrCreateCart(req.user!.id);
    return res.json({ success: true, data: { ...cart, ...calcTotals(cart.items) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// POST /api/buyer/cart/:productId
export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const quantity = z.number().int().positive().default(1).parse(req.body.quantity ?? 1);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });
    const cart = await getOrCreateCart(req.user!.id);
    const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
    if (existing) {
      if (product.stock < existing.quantity + quantity) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
    }
    trackEvent(req.user!.id, 'CART_ADD', { productId }).catch(() => {});
    const updated = await getOrCreateCart(req.user!.id);
    return res.json({ success: true, message: 'Item added to cart', data: { ...updated, ...calcTotals(updated.items) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// PUT /api/buyer/cart/:productId
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const quantity = z.number().int().positive().parse(req.body.quantity);
    const cart = await getOrCreateCart(req.user!.id);
    const item = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
    if (!item) return res.status(404).json({ success: false, message: 'Item not in cart' });
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive || product.stock < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    const updated = await getOrCreateCart(req.user!.id);
    return res.json({ success: true, message: 'Cart updated', data: { ...updated, ...calcTotals(updated.items) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// DELETE /api/buyer/cart/:productId
export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const cart = await getOrCreateCart(req.user!.id);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    const updated = await getOrCreateCart(req.user!.id);
    return res.json({ success: true, message: 'Item removed from cart', data: { ...updated, ...calcTotals(updated.items) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// DELETE /api/buyer/cart
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return res.json({ success: true, message: 'Cart cleared' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
