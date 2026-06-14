
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProfile, updateProfile, changeRole, getWallet, getWalletTransactions, topupWallet, withdrawWallet } from '../controllers/buyer.controller.js';
import { initiateMpesaTopup, initiateCardTopup, verifyMpesaTopup, getTransactions } from '../controllers/payment.controller.js';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/cart.controller.js';
import { placeOrder, getOrders, getOrder, cancelOrder, trackOrder, reviewOrder, requestRefund, getRefunds, raiseDispute, getDisputes } from '../controllers/order.controller.js';
import { getAddresses, addAddress, updateAddress, deleteAddress } from '../controllers/address.controller.js';
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlist.controller.js';
import { getNotifications, markRead, markAllRead, getNotificationPrefs, updateNotificationPrefs } from '../controllers/notification.controller.js';
import { getFollowing, followSeller, unfollowSeller, getActivity, logActivity, getMyReviews } from '../controllers/social.controller.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { getPaymentMethods, addPaymentMethod, deletePaymentMethod } from '../controllers/payment.controller.js';

const r = Router();
r.use(authenticate);

// Profile
r.get('/profile',  getProfile);
r.put('/profile',  updateProfile);
r.put('/role',     changeRole);

// Wallet
r.get('/wallet', getWallet);
r.get('/wallet/transactions', getWalletTransactions);
r.post('/wallet/topup', topupWallet);
r.post('/wallet/topup/mpesa', initiateMpesaTopup);  // M-Pesa STK push
r.post('/wallet/topup/card',  initiateCardTopup);    // Card via Paystack popup
r.post('/wallet/topup/verify', verifyMpesaTopup);   // poll/verify
r.get('/wallet/transactions', getTransactions);
r.post('/wallet/withdraw', withdrawWallet);

// Cart
r.get('/cart', getCart);
r.post('/cart/:productId', addToCart);
r.put('/cart/:productId', updateCartItem);
r.delete('/cart/:productId', removeFromCart);
r.delete('/cart', clearCart);

// Orders
r.post('/orders', placeOrder);
r.get('/orders', getOrders);
r.get('/orders/:id', getOrder);
r.put('/orders/:id/cancel', cancelOrder);
r.get('/orders/:id/tracking', trackOrder);
r.post('/orders/:id/review', reviewOrder);
r.post('/orders/:id/refund', requestRefund);
r.post('/orders/:id/dispute', raiseDispute);

// Refunds & Disputes
r.get('/refunds', getRefunds);
r.get('/disputes', getDisputes);

// Addresses
r.get('/addresses', getAddresses);
r.post('/addresses', addAddress);
r.put('/addresses/:id', updateAddress);
r.delete('/addresses/:id', deleteAddress);

// Wishlist
r.get('/wishlist', getWishlist);
r.post('/wishlist/:productId', addToWishlist);
r.delete('/wishlist/:productId', removeFromWishlist);

// Notifications
r.get('/notifications', getNotifications);
r.put('/notifications/read-all', markAllRead);
r.put('/notifications/:id/read', markRead);
r.get('/notifications/preferences', getNotificationPrefs);
r.put('/notifications/preferences', updateNotificationPrefs);

// Social
r.get('/following', getFollowing);
r.post('/follow/:sellerId', followSeller);
r.delete('/follow/:sellerId', unfollowSeller);
r.get('/activity', getActivity);
r.post('/activity', logActivity);
r.get('/reviews', getMyReviews);

// Settings
r.get('/settings', getSettings);
r.put('/settings', updateSettings);

// Payment Methods
r.get('/payment-methods', getPaymentMethods);
r.post('/payment-methods', addPaymentMethod);
r.delete('/payment-methods/:id', deletePaymentMethod);

export default r;
