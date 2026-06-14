
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

import authRoutes    from './routes/auth.routes.js';
import adminRoutes   from './routes/admin.routes.js';
import supportRoutes from './routes/support.routes.js';
import sellerRoutes  from './routes/seller.routes.js';
import uploadRoutes  from './routes/upload.routes.js';
import { paystackWebhook } from './controllers/payment.controller.js';
import buyerRoutes   from './routes/buyer.routes.js';
import productRoutes from './routes/product.routes.js';
import chatRoutes      from './routes/chat.routes.js';
import communityRoutes from './routes/community.routes.js';
import housingRoutes   from './routes/housing.routes.js';
import eventRoutes   from './routes/event.routes.js';

const app  = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve uploaded files (KYC images, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth',    authRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/seller',  sellerRoutes);
app.use('/api/upload',  uploadRoutes);
app.use('/api/buyer',   buyerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chats',     chatRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/housing',   housingRoutes);
app.use('/api/events',  eventRoutes);
app.use('/api/support', supportRoutes);

// Paystack webhook — must be raw body
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString());
  paystackWebhook(req as any, res);
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', message: '🚀 Kampas API running' }));

app.listen(PORT, () => {
  console.log('');
  console.log('  ✅ Kampas API running at http://localhost:' + PORT);
  console.log('');
  console.log('  AUTH        POST /api/auth/register | login | GET /me');
  console.log('  BUYER       /api/buyer/profile | wallet | cart | orders | wishlist');
  console.log('              /api/buyer/addresses | notifications | following | reviews');
  console.log('              /api/buyer/settings | payment-methods | refunds | disputes');
  console.log('  PRODUCTS    GET /api/products | /search | /trending | /recommended');
  console.log('  CHATS       /api/chats');
  console.log('  HOUSING     /api/housing');
  console.log('  EVENTS      /api/events');
  console.log('');
});

export default app;
