
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireSeller } from '../middleware/seller.js';

import {
  getSellerProfile, updateSellerProfile,
  getStore, updateStore,
  getSellerWallet, getSellerTransactions, requestPayout, getPayouts,
  getSellerNotifications, getSellerSettings, updateSellerSettings,
  submitVerification, getKycStatus, getCustomers,
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

// ── KYC ───────────────────────────────────────────────────────────────────────
r.get('/kyc',                      getKycStatus);
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
