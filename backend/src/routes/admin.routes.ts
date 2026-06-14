
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import {
  getStats, getAnalytics,
  getUsers, suspendUser, activateUser, updateUserRole, deleteUser,
  getSellers,
  getProducts, featureProduct, deleteProduct,
  getOrders,
  getTransactions,
  getAds, approveAd, rejectAd,
  getKYC, approveKYC, rejectKYC,
  getReports, resolveReport,
  getDisputes, resolveDispute,
  sendAnnouncement,
  makeAdmin,
  getSettings, updateSettings, getReferralStats,
  testBrevoConnection, testPaystackConnection,
} from '../controllers/admin.controller.js';
import { adminGetTickets, adminGetTicket, adminReply, adminCloseTicket } from '../controllers/support.controller.js';

const r = Router();
r.use(authenticate, requireAdmin);

// Platform stats & analytics
r.get('/stats',           getStats);
r.get('/analytics',       getAnalytics);

// Users
r.get('/users',                    getUsers);
r.put('/users/:id/suspend',        suspendUser);
r.put('/users/:id/activate',       activateUser);
r.put('/users/:id/role',           updateUserRole);
r.delete('/users/:id',             deleteUser);

// Sellers
r.get('/sellers',                  getSellers);

// Products
r.get('/products',                 getProducts);
r.put('/products/:id/feature',     featureProduct);
r.delete('/products/:id',          deleteProduct);

// Orders
r.get('/orders',                   getOrders);

// Transactions
r.get('/transactions',             getTransactions);

// Ads
r.get('/ads',                      getAds);
r.put('/ads/:id/approve',          approveAd);
r.put('/ads/:id/reject',           rejectAd);

// KYC
r.get('/kyc',                      getKYC);
r.put('/kyc/:id/approve',          approveKYC);
r.put('/kyc/:id/reject',           rejectKYC);

// Reports
r.get('/reports',                  getReports);
r.put('/reports/:id/resolve',      resolveReport);

// Disputes
r.get('/disputes',                 getDisputes);
r.put('/disputes/:id/resolve',     resolveDispute);

// Announcements
r.post('/announcements',            sendAnnouncement);

// System settings
r.get('/settings',                 getSettings);
r.put('/settings',                 updateSettings);
r.post('/settings/test-brevo',     testBrevoConnection);
r.post('/settings/test-paystack',  testPaystackConnection);

// Referral stats
r.get('/referral-stats',           getReferralStats);

// Support tickets
r.get('/support',                  adminGetTickets);
r.get('/support/:id',              adminGetTicket);
r.post('/support/:id/reply',       adminReply);
r.put('/support/:id/close',        adminCloseTicket);

// Make admin (public endpoint — use once then remove)
r.post('/make-admin',              makeAdmin);

export default r;
