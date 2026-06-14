import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const B = path.join(__dirname, 'backend');

const mkdir = (dir) => fs.mkdirSync(path.join(B, dir), { recursive: true });
const writeB = (filePath, content) => {
  fs.writeFileSync(path.join(B, filePath), content, 'utf8');
  console.log(`  📄 backend/${filePath}`);
};
const run = (cmd) => execSync(cmd, { stdio: 'inherit', cwd: B });

console.log('\n=============================================');
console.log('  🏪 Kampas — Full Seller Backend');
console.log('=============================================\n');

mkdir('src/controllers');
mkdir('src/routes');

// ─────────────────────────────────────────────────────────────────────────────
// 1. UPDATE PRISMA SCHEMA — add seller models
// ─────────────────────────────────────────────────────────────────────────────
const schemaPath = path.join(B, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Add sellerBalance + new relations to User
if (!schema.includes('sellerBalance')) {
  schema = schema.replace(
    '  walletBalance Float    @default(0)',
    '  walletBalance Float    @default(0)\n  sellerBalance Float    @default(0)'
  );
  schema = schema.replace(
    '  organizedEvents      Event[]\n  otps                 OTP[]',
    `  organizedEvents      Event[]
  otps                 OTP[]
  store                Store?
  ads                  Ad[]
  deliveryZones        DeliveryZone[]
  promotions           Promotion[]
  sellerSettings       SellerSettings?
  sellerVerification   SellerVerification?
  payouts              Payout[]`
  );
}

// Add ads relation to Product
if (!schema.includes('ads                  Ad[]') && schema.includes('activityLogs  ActivityLog[]')) {
  schema = schema.replace(
    '  activityLogs  ActivityLog[]',
    '  activityLogs  ActivityLog[]\n  ads           Ad[]'
  );
}

// Add new models
if (!schema.includes('model Store')) {
  schema += `
model Store {
  id             String   @id @default(cuid())
  sellerId       String   @unique
  seller         User     @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  name           String
  description    String?
  banner         String?
  logo           String?
  theme          String   @default("pink")
  returnPolicy   String?
  deliveryPolicy String?
  isOpen         Boolean  @default(true)
  vacationMode   Boolean  @default(false)
  categories     String?
  socialLinks    String?
  operatingHours String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Ad {
  id           String   @id @default(cuid())
  sellerId     String
  seller       User     @relation(fields: [sellerId], references: [id])
  productId    String?
  product      Product? @relation(fields: [productId], references: [id])
  title        String
  description  String?
  image        String?
  targetCampus String?
  budget       Float    @default(0)
  spent        Float    @default(0)
  impressions  Int      @default(0)
  clicks       Int      @default(0)
  status       String   @default("PENDING")
  startDate    DateTime?
  endDate      DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model DeliveryZone {
  id        String   @id @default(cuid())
  sellerId  String
  seller    User     @relation(fields: [sellerId], references: [id])
  name      String
  campus    String
  fee       Float    @default(0)
  minOrder  Float    @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Promotion {
  id        String    @id @default(cuid())
  sellerId  String
  seller    User      @relation(fields: [sellerId], references: [id])
  code      String    @unique
  type      String
  value     Float
  minOrder  Float     @default(0)
  maxUses   Int?
  uses      Int       @default(0)
  isActive  Boolean   @default(true)
  expiresAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model SellerSettings {
  id           String   @id @default(cuid())
  sellerId     String   @unique
  seller       User     @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  newOrders    Boolean  @default(true)
  payments     Boolean  @default(true)
  reviews      Boolean  @default(true)
  lowStock     Boolean  @default(true)
  vacationMode Boolean  @default(false)
  storeVisible Boolean  @default(true)
  autoConfirm  Boolean  @default(false)
  updatedAt    DateTime @updatedAt
}

model SellerVerification {
  id          String   @id @default(cuid())
  sellerId    String   @unique
  seller      User     @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  idFront     String?
  idBack      String?
  businessDoc String?
  selfie      String?
  status      String   @default("PENDING")
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Payout {
  id          String   @id @default(cuid())
  sellerId    String
  seller      User     @relation(fields: [sellerId], references: [id])
  amount      Float
  phone       String?
  method      String   @default("MPESA")
  status      String   @default("PENDING")
  reference   String?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
`;
}

fs.writeFileSync(schemaPath, schema);
console.log('  📄 prisma/schema.prisma (seller models added)');

// ─────────────────────────────────────────────────────────────────────────────
// 2. SELLER PROFILE & STORE CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/controllers/seller.controller.ts', `
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const safeSelect = {
  id: true, name: true, email: true, phone: true, campus: true,
  role: true, avatar: true, sellerBalance: true, isVerified: true, createdAt: true,
};

// ── GET /api/seller/profile ───────────────────────────────────────────────────
export const getSellerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.user!.id },
      select:  { ...safeSelect, store: true, sellerVerification: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Seller not found' });
    return res.json({ success: true, data: { seller: user } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/seller/profile ───────────────────────────────────────────────────
export const updateSellerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      name:   z.string().min(2).optional(),
      phone:  z.string().optional(),
      campus: z.string().optional(),
      avatar: z.string().url().optional(),
    }).parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.id }, data, select: safeSelect });
    return res.json({ success: true, message: 'Profile updated', data: { seller: user } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/seller/store ─────────────────────────────────────────────────────
export const getStore = async (req: AuthRequest, res: Response) => {
  try {
    let store = await prisma.store.findUnique({ where: { sellerId: req.user!.id } });
    if (!store) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
      store = await prisma.store.create({ data: { sellerId: req.user!.id, name: user?.name + "'s Store" } });
    }
    return res.json({ success: true, data: { store } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/seller/store ─────────────────────────────────────────────────────
export const updateStore = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      name:           z.string().min(2).optional(),
      description:    z.string().optional(),
      banner:         z.string().optional(),
      logo:           z.string().optional(),
      theme:          z.string().optional(),
      returnPolicy:   z.string().optional(),
      deliveryPolicy: z.string().optional(),
      isOpen:         z.boolean().optional(),
      vacationMode:   z.boolean().optional(),
      categories:     z.array(z.string()).optional(),
      socialLinks:    z.record(z.string()).optional(),
      operatingHours: z.record(z.string()).optional(),
    }).parse(req.body);

    const storeData: any = { ...data };
    if (data.categories)     storeData.categories     = JSON.stringify(data.categories);
    if (data.socialLinks)    storeData.socialLinks    = JSON.stringify(data.socialLinks);
    if (data.operatingHours) storeData.operatingHours = JSON.stringify(data.operatingHours);

    const store = await prisma.store.upsert({
      where:  { sellerId: req.user!.id },
      update: storeData,
      create: { sellerId: req.user!.id, name: 'My Store', ...storeData },
    });
    return res.json({ success: true, message: 'Store updated', data: { store } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/seller/wallet ────────────────────────────────────────────────────
export const getSellerWallet = async (req: AuthRequest, res: Response) => {
  try {
    const [user, transactions, pendingOrders] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerBalance: true } }),
      prisma.walletTransaction.findMany({ where: { userId: req.user!.id, type: { in: ['EARNING', 'WITHDRAWAL', 'PAYOUT'] } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.order.aggregate({ where: { sellerId: req.user!.id, paymentStatus: 'PAID', status: { notIn: ['CANCELLED', 'REFUNDED'] } }, _sum: { total: true } }),
    ]);
    return res.json({ success: true, data: { balance: user?.sellerBalance ?? 0, pending: pendingOrders._sum.total ?? 0, transactions } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/seller/wallet/transactions ───────────────────────────────────────
export const getSellerTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const page  = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.walletTransaction.count({ where: { userId: req.user!.id } }),
    ]);
    return res.json({ success: true, data: { transactions, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── POST /api/seller/wallet/withdraw ─────────────────────────────────────────
export const requestPayout = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, phone } = z.object({ amount: z.number().positive(), phone: z.string().min(10) }).parse(req.body);
    const seller = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerBalance: true } });
    if (!seller || seller.sellerBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient seller balance' });
    }
    const payout = await prisma.payout.create({ data: { sellerId: req.user!.id, amount, phone, status: 'PENDING' } });
    await prisma.user.update({ where: { id: req.user!.id }, data: { sellerBalance: { decrement: amount } } });
    await prisma.notification.create({ data: { userId: req.user!.id, type: 'SYSTEM', title: 'Payout Requested', body: \`Your payout of KSH \${amount.toLocaleString()} is being processed.\` } });
    return res.status(201).json({ success: true, message: 'Payout request submitted', data: { payout } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/seller/payouts ───────────────────────────────────────────────────
export const getPayouts = async (req: AuthRequest, res: Response) => {
  try {
    const payouts = await prisma.payout.findMany({ where: { sellerId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { payouts } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/seller/notifications ────────────────────────────────────────────
export const getSellerNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);
    return res.json({ success: true, data: { notifications, unread } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── GET /api/seller/settings ──────────────────────────────────────────────────
export const getSellerSettings = async (req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.sellerSettings.findUnique({ where: { sellerId: req.user!.id } });
    if (!settings) settings = await prisma.sellerSettings.create({ data: { sellerId: req.user!.id } });
    return res.json({ success: true, data: { settings } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PUT /api/seller/settings ──────────────────────────────────────────────────
export const updateSellerSettings = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      newOrders:    z.boolean().optional(),
      payments:     z.boolean().optional(),
      reviews:      z.boolean().optional(),
      lowStock:     z.boolean().optional(),
      vacationMode: z.boolean().optional(),
      storeVisible: z.boolean().optional(),
      autoConfirm:  z.boolean().optional(),
    }).parse(req.body);
    const settings = await prisma.sellerSettings.upsert({ where: { sellerId: req.user!.id }, update: data, create: { sellerId: req.user!.id, ...data } });
    return res.json({ success: true, message: 'Settings updated', data: { settings } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/seller/verification ─────────────────────────────────────────────
export const submitVerification = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({ idFront: z.string().optional(), idBack: z.string().optional(), businessDoc: z.string().optional(), selfie: z.string().optional() }).parse(req.body);
    const verification = await prisma.sellerVerification.upsert({ where: { sellerId: req.user!.id }, update: { ...data, status: 'PENDING' }, create: { sellerId: req.user!.id, ...data } });
    return res.json({ success: true, message: 'Verification submitted for review', data: { verification } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /api/seller/customers ─────────────────────────────────────────────────
export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where:   { sellerId: req.user!.id, status: 'DELIVERED' },
      include: { buyer: { select: { id: true, name: true, email: true, avatar: true, campus: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const customerMap = new Map<string, any>();
    for (const order of orders) {
      const id = order.buyer.id;
      if (!customerMap.has(id)) {
        customerMap.set(id, { ...order.buyer, totalOrders: 0, totalSpent: 0, lastOrder: order.createdAt });
      }
      const c = customerMap.get(id);
      c.totalOrders++;
      c.totalSpent += order.total;
    }
    return res.json({ success: true, data: { customers: Array.from(customerMap.values()) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. SELLER PRODUCTS CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/controllers/seller-products.controller.ts', `
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const productSchema = z.object({
  title:       z.string().min(2),
  description: z.string().optional(),
  price:       z.number().positive(),
  campus:      z.string().min(2),
  condition:   z.enum(['NEW', 'SLIGHTLY_USED', 'USED', 'THRIFTED']),
  categoryId:  z.string().optional(),
  stock:       z.number().int().min(0).default(1),
  isActive:    z.boolean().default(true),
  isFeatured:  z.boolean().default(false),
  images:      z.array(z.object({ url: z.string().url(), isPrimary: z.boolean().default(false) })).optional(),
});

const productInclude = {
  images:   true,
  category: true,
  _count:   { select: { orderItems: true, wishlistItems: true, reviews: true } },
};

// GET /api/seller/products
export const getSellerProducts = async (req: AuthRequest, res: Response) => {
  try {
    const page      = parseInt(req.query.page as string) || 1;
    const limit     = parseInt(req.query.limit as string) || 20;
    const status    = req.query.status as string;
    const search    = req.query.q as string;
    const where: any = { sellerId: req.user!.id };
    if (status === 'active')   where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) where.title = { contains: search };
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where }),
    ]);
    return res.json({ success: true, data: { products, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// POST /api/seller/products
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { images, ...data } = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        ...data,
        sellerId: req.user!.id,
        ...(images ? { images: { create: images } } : {}),
      },
      include: productInclude,
    });
    return res.status(201).json({ success: true, message: 'Product created', data: { product } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/seller/products/:id
export const getSellerProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findFirst({
      where:   { id: req.params.id, sellerId: req.user!.id },
      include: { ...productInclude, reviews: { include: { reviewer: { select: { id: true, name: true, avatar: true } } }, take: 10 } },
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, data: { product } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// PUT /api/seller/products/:id
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    const { images, ...data } = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({
      where:   { id: req.params.id },
      data,
      include: productInclude,
    });
    return res.json({ success: true, message: 'Product updated', data: { product } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/seller/products/:id
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    return res.json({ success: true, message: 'Product removed from marketplace' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// PUT /api/seller/products/:id/stock
export const updateStock = async (req: AuthRequest, res: Response) => {
  try {
    const { stock } = z.object({ stock: z.number().int().min(0) }).parse(req.body);
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { stock, isActive: stock > 0 } });
    return res.json({ success: true, message: 'Stock updated', data: { stock: product.stock } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/seller/inventory
export const getInventory = async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where:   { sellerId: req.user!.id },
      select:  { id: true, title: true, stock: true, isActive: true, price: true, images: { take: 1 } },
      orderBy: { stock: 'asc' },
    });
    const lowStock  = products.filter(p => p.stock > 0 && p.stock <= 3);
    const outOfStock = products.filter(p => p.stock === 0);
    return res.json({ success: true, data: { products, lowStock: lowStock.length, outOfStock: outOfStock.length } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. SELLER ORDERS CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/controllers/seller-orders.controller.ts', `
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const ORDER_STATUSES = ['PENDING','CONFIRMED','PROCESSING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'];

const orderInclude = {
  items:       { include: { product: { include: { images: true } } } },
  buyer:       { select: { id: true, name: true, email: true, phone: true, avatar: true, campus: true } },
  address:     true,
  trackingInfo: { orderBy: { createdAt: 'desc' as const } },
};

// GET /api/seller/orders
export const getSellerOrders = async (req: AuthRequest, res: Response) => {
  try {
    const page   = parseInt(req.query.page as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const where: any = { sellerId: req.user!.id };
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.order.count({ where }),
    ]);
    return res.json({ success: true, data: { orders, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/seller/orders/:id
export const getSellerOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, sellerId: req.user!.id }, include: { ...orderInclude, refund: true, dispute: true, review: true } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: { order } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// PUT /api/seller/orders/:id/status
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, note } = z.object({ status: z.enum(ORDER_STATUSES as [string, ...string[]]), note: z.string().optional() }).parse(req.body);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await prisma.order.update({ where: { id: order.id }, data: { status } });
    await prisma.orderTracking.create({ data: { orderId: order.id, status, note: note || \`Order \${status.toLowerCase().replace(/_/g, ' ')}\` } });

    // Credit seller when order delivered
    if (status === 'DELIVERED') {
      const platformFee = order.total * 0.05;
      const sellerEarning = order.total - platformFee;
      const updatedSeller = await prisma.user.update({ where: { id: req.user!.id }, data: { sellerBalance: { increment: sellerEarning } }, select: { sellerBalance: true } });
      await prisma.walletTransaction.create({
        data: { userId: req.user!.id, type: 'EARNING', amount: sellerEarning, balance: updatedSeller.sellerBalance, description: \`Earning from order #\${order.id.slice(-6).toUpperCase()} (5% platform fee deducted)\` },
      });
    }

    // Notify buyer
    await prisma.notification.create({ data: { userId: order.buyerId, type: 'ORDER', title: 'Order Update', body: \`Your order #\${order.id.slice(-6).toUpperCase()} is now \${status.replace(/_/g, ' ')}\` } });

    return res.json({ success: true, message: \`Order marked as \${status}\` });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PUT /api/seller/orders/:id/cancel
export const cancelSellerOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (['DELIVERED', 'CANCELLED'].includes(order.status)) return res.status(400).json({ success: false, message: 'Cannot cancel this order' });

    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    await prisma.orderTracking.create({ data: { orderId: order.id, status: 'CANCELLED', note: \`Cancelled by seller: \${reason}\` } });

    // Refund buyer
    if (order.paymentStatus === 'PAID') {
      const updated = await prisma.user.update({ where: { id: order.buyerId }, data: { walletBalance: { increment: order.total } }, select: { walletBalance: true } });
      await prisma.walletTransaction.create({ data: { userId: order.buyerId, type: 'REFUND', amount: order.total, balance: updated.walletBalance, description: \`Refund for cancelled order #\${order.id.slice(-6).toUpperCase()}\` } });
      await prisma.notification.create({ data: { userId: order.buyerId, type: 'ORDER', title: 'Order Cancelled', body: \`Your order #\${order.id.slice(-6).toUpperCase()} was cancelled. KSH \${order.total.toLocaleString()} refunded to your wallet.\` } });
    }
    return res.json({ success: true, message: 'Order cancelled and buyer refunded' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/seller/orders/:id/note
export const addOrderNote = async (req: AuthRequest, res: Response) => {
  try {
    const { note } = z.object({ note: z.string().min(1) }).parse(req.body);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    await prisma.orderTracking.create({ data: { orderId: order.id, status: order.status, note } });
    return res.json({ success: true, message: 'Note added' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/seller/refunds
export const getSellerRefunds = async (req: AuthRequest, res: Response) => {
  try {
    const refunds = await prisma.refund.findMany({ where: { order: { sellerId: req.user!.id } }, include: { order: true, user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { refunds } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/seller/disputes
export const getSellerDisputes = async (req: AuthRequest, res: Response) => {
  try {
    const disputes = await prisma.dispute.findMany({ where: { order: { sellerId: req.user!.id } }, include: { order: true, raisedBy: { select: { id: true, name: true, email: true } }, evidence: true }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { disputes } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// POST /api/seller/disputes/:id/respond
export const respondToDispute = async (req: AuthRequest, res: Response) => {
  try {
    const { response } = z.object({ response: z.string().min(10) }).parse(req.body);
    const dispute = await prisma.dispute.findFirst({ where: { id: req.params.id, order: { sellerId: req.user!.id } } });
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });
    await prisma.dispute.update({ where: { id: dispute.id }, data: { resolution: response, status: 'UNDER_REVIEW' } });
    return res.json({ success: true, message: 'Response submitted' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
`);

// ─────────────────────────────────────────────────────────────────────────────
// 5. SELLER ANALYTICS CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/controllers/seller-analytics.controller.ts', `
import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

// GET /api/seller/analytics
export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.id;
    const now      = new Date();
    const month    = new Date(now.getFullYear(), now.getMonth(), 1);
    const week     = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalRevenue, monthRevenue, weekRevenue,
      totalOrders, pendingOrders, deliveredOrders,
      totalProducts, activeProducts,
      totalCustomers,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.order.aggregate({ where: { sellerId, status: 'DELIVERED' }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { sellerId, status: 'DELIVERED', createdAt: { gte: month } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { sellerId, status: 'DELIVERED', createdAt: { gte: week } }, _sum: { total: true } }),
      prisma.order.count({ where: { sellerId } }),
      prisma.order.count({ where: { sellerId, status: 'PENDING' } }),
      prisma.order.count({ where: { sellerId, status: 'DELIVERED' } }),
      prisma.product.count({ where: { sellerId } }),
      prisma.product.count({ where: { sellerId, isActive: true } }),
      prisma.order.findMany({ where: { sellerId }, distinct: ['buyerId'], select: { buyerId: true } }).then(r => r.length),
      prisma.orderItem.groupBy({ by: ['productId'], where: { order: { sellerId, status: 'DELIVERED' } }, _sum: { quantity: true, price: true }, orderBy: { _sum: { price: 'desc' } }, take: 5 }),
      prisma.order.findMany({ where: { sellerId }, include: { buyer: { select: { name: true, avatar: true } }, items: { include: { product: { select: { title: true } } } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    // Enrich top products
    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({ where: { id: { in: topProductIds } }, include: { images: { take: 1 } } });
    const enrichedTopProducts = topProducts.map(tp => ({
      ...tp,
      product: productDetails.find(p => p.id === tp.productId),
    }));

    return res.json({
      success: true,
      data: {
        revenue:  { total: totalRevenue._sum.total ?? 0, month: monthRevenue._sum.total ?? 0, week: weekRevenue._sum.total ?? 0 },
        orders:   { total: totalOrders, pending: pendingOrders, delivered: deliveredOrders },
        products: { total: totalProducts, active: activeProducts },
        customers: totalCustomers,
        topProducts: enrichedTopProducts,
        recentOrders,
      },
    });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/seller/analytics/sales
export const getSalesAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const days    = parseInt(req.query.days as string) || 30;
    const from    = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders  = await prisma.order.findMany({
      where:   { sellerId: req.user!.id, status: 'DELIVERED', createdAt: { gte: from } },
      select:  { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const byDate: Record<string, number> = {};
    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + order.total;
    }

    const salesData = Object.entries(byDate).map(([date, revenue]) => ({ date, revenue }));
    return res.json({ success: true, data: { salesData, period: days } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// GET /api/seller/reviews
export const getSellerReviews = async (req: AuthRequest, res: Response) => {
  try {
    const [reviews, stats] = await Promise.all([
      prisma.review.findMany({
        where:   { sellerId: req.user!.id },
        include: { reviewer: { select: { id: true, name: true, avatar: true } }, product: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.aggregate({ where: { sellerId: req.user!.id }, _avg: { rating: true }, _count: true }),
    ]);
    return res.json({ success: true, data: { reviews, avgRating: stats._avg.rating?.toFixed(1), total: stats._count } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
`);

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADS & PROMOTIONS CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/controllers/seller-ads.controller.ts', `
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const adSchema = z.object({
  title:        z.string().min(2),
  description:  z.string().optional(),
  image:        z.string().optional(),
  productId:    z.string().optional(),
  targetCampus: z.string().optional(),
  budget:       z.number().positive(),
  startDate:    z.string().optional(),
  endDate:      z.string().optional(),
});

const promoSchema = z.object({
  code:      z.string().min(3).toUpperCase(),
  type:      z.enum(['PERCENTAGE', 'FIXED']),
  value:     z.number().positive(),
  minOrder:  z.number().default(0),
  maxUses:   z.number().optional(),
  expiresAt: z.string().optional(),
});

// ── ADS ──────────────────────────────────────────────────────────────────────
export const getAds = async (req: AuthRequest, res: Response) => {
  try {
    const ads = await prisma.ad.findMany({ where: { sellerId: req.user!.id }, include: { product: { select: { title: true, images: true } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { ads } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const createAd = async (req: AuthRequest, res: Response) => {
  try {
    const data = adSchema.parse(req.body);
    const seller = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sellerBalance: true } });
    if (!seller || seller.sellerBalance < data.budget) return res.status(400).json({ success: false, message: 'Insufficient balance for ad budget' });
    const ad = await prisma.ad.create({ data: { ...data, sellerId: req.user!.id, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined } });
    return res.status(201).json({ success: true, message: 'Ad created. Pending admin approval.', data: { ad } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateAd = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.ad.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Ad not found' });
    const data = adSchema.partial().parse(req.body);
    const ad = await prisma.ad.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, message: 'Ad updated', data: { ad } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteAd = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.ad.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Ad not found' });
    await prisma.ad.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Ad deleted' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const getAdAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const ads = await prisma.ad.findMany({ where: { sellerId: req.user!.id }, select: { id: true, title: true, impressions: true, clicks: true, spent: true, budget: true, status: true } });
    const totals = ads.reduce((acc, ad) => ({ impressions: acc.impressions + ad.impressions, clicks: acc.clicks + ad.clicks, spent: acc.spent + ad.spent }), { impressions: 0, clicks: 0, spent: 0 });
    const ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';
    return res.json({ success: true, data: { ads, totals: { ...totals, ctr } } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── PROMOTIONS ────────────────────────────────────────────────────────────────
export const getPromotions = async (req: AuthRequest, res: Response) => {
  try {
    const promotions = await prisma.promotion.findMany({ where: { sellerId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { promotions } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const createPromotion = async (req: AuthRequest, res: Response) => {
  try {
    const data = promoSchema.parse(req.body);
    const promotion = await prisma.promotion.create({ data: { ...data, sellerId: req.user!.id, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined } });
    return res.status(201).json({ success: true, message: 'Promotion created', data: { promotion } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updatePromotion = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.promotion.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Promotion not found' });
    const data = promoSchema.partial().parse(req.body);
    const promotion = await prisma.promotion.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, message: 'Promotion updated', data: { promotion } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deletePromotion = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.promotion.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Promotion not found' });
    await prisma.promotion.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Promotion deleted' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

// ── DELIVERY ZONES ────────────────────────────────────────────────────────────
export const getDeliveryZones = async (req: AuthRequest, res: Response) => {
  try {
    const zones = await prisma.deliveryZone.findMany({ where: { sellerId: req.user!.id }, orderBy: { campus: 'asc' } });
    return res.json({ success: true, data: { zones } });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};

export const createDeliveryZone = async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({ name: z.string().min(2), campus: z.string().min(2), fee: z.number().min(0), minOrder: z.number().min(0).default(0) }).parse(req.body);
    const zone = await prisma.deliveryZone.create({ data: { ...data, sellerId: req.user!.id } });
    return res.status(201).json({ success: true, message: 'Delivery zone added', data: { zone } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateDeliveryZone = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.deliveryZone.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Zone not found' });
    const data = z.object({ name: z.string().optional(), campus: z.string().optional(), fee: z.number().optional(), minOrder: z.number().optional(), isActive: z.boolean().optional() }).parse(req.body);
    const zone = await prisma.deliveryZone.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, message: 'Zone updated', data: { zone } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteDeliveryZone = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.deliveryZone.findFirst({ where: { id: req.params.id, sellerId: req.user!.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Zone not found' });
    await prisma.deliveryZone.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Zone deleted' });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Internal server error' }); }
};
`);

// ─────────────────────────────────────────────────────────────────────────────
// 7. SELLER MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/middleware/seller.ts', `
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';

export const requireSeller = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'SELLER') {
    return res.status(403).json({ success: false, message: 'Seller access required' });
  }
  next();
};
`);

// ─────────────────────────────────────────────────────────────────────────────
// 8. SELLER ROUTES
// ─────────────────────────────────────────────────────────────────────────────
writeB('src/routes/seller.routes.ts', `
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireSeller } from '../middleware/seller.js';

import {
  getSellerProfile, updateSellerProfile,
  getStore, updateStore,
  getSellerWallet, getSellerTransactions, requestPayout, getPayouts,
  getSellerNotifications, getSellerSettings, updateSellerSettings,
  submitVerification, getCustomers,
} from '../controllers/seller.controller.js';

import {
  getSellerProducts, createProduct, getSellerProduct,
  updateProduct, deleteProduct, updateStock, getInventory,
} from '../controllers/seller-products.controller.js';

import {
  getSellerOrders, getSellerOrder, updateOrderStatus,
  cancelSellerOrder, addOrderNote, getSellerRefunds,
  getSellerDisputes, respondToDispute,
} from '../controllers/seller-orders.controller.js';

import {
  getAnalytics, getSalesAnalytics, getSellerReviews,
} from '../controllers/seller-analytics.controller.js';

import {
  getAds, createAd, updateAd, deleteAd, getAdAnalytics,
  getPromotions, createPromotion, updatePromotion, deletePromotion,
  getDeliveryZones, createDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
} from '../controllers/seller-ads.controller.js';

const r = Router();
r.use(authenticate, requireSeller);

// ── Profile & Store ───────────────────────────────────────────────────────────
r.get('/profile',         getSellerProfile);
r.put('/profile',         updateSellerProfile);
r.get('/store',           getStore);
r.put('/store',           updateStore);

// ── Products ──────────────────────────────────────────────────────────────────
r.get('/products',             getSellerProducts);
r.post('/products',            createProduct);
r.get('/products/:id',         getSellerProduct);
r.put('/products/:id',         updateProduct);
r.delete('/products/:id',      deleteProduct);
r.put('/products/:id/stock',   updateStock);
r.get('/inventory',            getInventory);

// ── Orders ────────────────────────────────────────────────────────────────────
r.get('/orders',                   getSellerOrders);
r.get('/orders/:id',               getSellerOrder);
r.put('/orders/:id/status',        updateOrderStatus);
r.put('/orders/:id/cancel',        cancelSellerOrder);
r.post('/orders/:id/note',         addOrderNote);

// ── Refunds & Disputes ────────────────────────────────────────────────────────
r.get('/refunds',                  getSellerRefunds);
r.get('/disputes',                 getSellerDisputes);
r.post('/disputes/:id/respond',    respondToDispute);

// ── Wallet & Payouts ──────────────────────────────────────────────────────────
r.get('/wallet',                   getSellerWallet);
r.get('/wallet/transactions',      getSellerTransactions);
r.post('/wallet/withdraw',         requestPayout);
r.get('/payouts',                  getPayouts);

// ── Analytics ─────────────────────────────────────────────────────────────────
r.get('/analytics',                getAnalytics);
r.get('/analytics/sales',          getSalesAnalytics);
r.get('/reviews',                  getSellerReviews);

// ── Customers ─────────────────────────────────────────────────────────────────
r.get('/customers',                getCustomers);

// ── Notifications & Settings ──────────────────────────────────────────────────
r.get('/notifications',            getSellerNotifications);
r.get('/settings',                 getSellerSettings);
r.put('/settings',                 updateSellerSettings);

// ── Verification ──────────────────────────────────────────────────────────────
r.post('/verification',            submitVerification);

// ── Ads ───────────────────────────────────────────────────────────────────────
r.get('/ads',                      getAds);
r.post('/ads',                     createAd);
r.put('/ads/:id',                  updateAd);
r.delete('/ads/:id',               deleteAd);
r.get('/ads/analytics',            getAdAnalytics);

// ── Promotions ────────────────────────────────────────────────────────────────
r.get('/promotions',               getPromotions);
r.post('/promotions',              createPromotion);
r.put('/promotions/:id',           updatePromotion);
r.delete('/promotions/:id',        deletePromotion);

// ── Delivery Zones ────────────────────────────────────────────────────────────
r.get('/delivery-zones',           getDeliveryZones);
r.post('/delivery-zones',          createDeliveryZone);
r.put('/delivery-zones/:id',       updateDeliveryZone);
r.delete('/delivery-zones/:id',    deleteDeliveryZone);

export default r;
`);

// ─────────────────────────────────────────────────────────────────────────────
// 9. UPDATE INDEX.TS
// ─────────────────────────────────────────────────────────────────────────────
const indexPath = path.join(B, 'src/index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');
if (!indexContent.includes('sellerRoutes')) {
  indexContent = indexContent.replace(
    `import authRoutes    from './routes/auth.routes.js';`,
    `import authRoutes    from './routes/auth.routes.js';
import sellerRoutes  from './routes/seller.routes.js';`
  );
  indexContent = indexContent.replace(
    `app.use('/api/auth',    authRoutes);`,
    `app.use('/api/auth',    authRoutes);
app.use('/api/seller',  sellerRoutes);`
  );
  fs.writeFileSync(indexPath, indexContent);
  console.log('  📄 backend/src/index.ts (seller routes added)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. MIGRATE DATABASE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🗄️  Running database migration...\n');
run('npx prisma migrate dev --name seller_backend');
run('npx prisma generate');

console.log('\n=============================================');
console.log('  ✅ Seller Backend Complete!');
console.log('');
console.log('  Endpoints ready:');
console.log('  Profile  GET/PUT /api/seller/profile');
console.log('  Store    GET/PUT /api/seller/store');
console.log('  Products Full CRUD /api/seller/products');
console.log('  Orders   GET/PUT  /api/seller/orders');
console.log('  Wallet   GET/POST /api/seller/wallet');
console.log('  Analytics         /api/seller/analytics');
console.log('  Ads      Full CRUD /api/seller/ads');
console.log('  Promos   Full CRUD /api/seller/promotions');
console.log('  Zones    Full CRUD /api/seller/delivery-zones');
console.log('  Reviews           /api/seller/reviews');
console.log('  Disputes          /api/seller/disputes');
console.log('  Refunds           /api/seller/refunds');
console.log('  Settings GET/PUT  /api/seller/settings');
console.log('  Customers         /api/seller/customers');
console.log('=============================================\n');