import { Router } from 'express';
import { register, login, getMe, completeOnboarding, completeSurvey } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import {
  verifyEmailOTP,
  resendVerification,
  resendVerificationPublic,
  forgotPassword,
  resetPassword,
} from '../controllers/verification.controller.js';

const router = Router();

// ── Core auth ─────────────────────────────────────────────────────────────────
router.post('/register', register);
router.post('/login',    login);
router.get('/me',        authenticate, getMe);

// ── Onboarding (protected) ────────────────────────────────────────────────────
router.post('/onboarding', authenticate, completeOnboarding);
router.post('/survey',     authenticate, completeSurvey);

// ── Email verification via OTP ────────────────────────────────────────────────
router.post('/verify-email-otp',         verifyEmailOTP);
router.post('/resend-verification',      authenticate, resendVerification);
router.post('/resend-verification-public', resendVerificationPublic);

// ── Password reset (public) ───────────────────────────────────────────────────
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

export default router;
