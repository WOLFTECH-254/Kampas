import nodemailer from 'nodemailer';
import { prisma } from './prisma.js';

async function getEmailConfig() {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'brevo_api_key',
            'brevo_smtp_user', 'brevo_smtp_pass',
            'brevo_sender_name', 'brevo_sender_email',
          ],
        },
      },
    });
    const s: Record<string, string> = {};
    for (const r of rows) s[r.key] = r.value;
    return {
      apiKey:      s.brevo_api_key      || process.env.BREVO_API_KEY,
      smtpUser:    s.brevo_smtp_user    || process.env.BREVO_SMTP_USER,
      smtpPass:    s.brevo_smtp_pass    || process.env.BREVO_SMTP_PASS,
      senderName:  s.brevo_sender_name  || process.env.BREVO_SENDER_NAME  || 'Kampas',
      senderEmail: s.brevo_sender_email || process.env.BREVO_SENDER_EMAIL || 'noreply@kampas.co.ke',
    };
  } catch {
    return {
      apiKey:      process.env.BREVO_API_KEY,
      smtpUser:    process.env.BREVO_SMTP_USER,
      smtpPass:    process.env.BREVO_SMTP_PASS,
      senderName:  process.env.BREVO_SENDER_NAME  || 'Kampas',
      senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@kampas.co.ke',
    };
  }
}

const BRAND_HEADER = `
  <div style="background:#ec4899;padding:24px 32px;">
    <div style="display:inline-flex;align-items:center;gap:10px;">
      <div style="width:36px;height:36px;background:#fff;border-radius:10px;font-size:20px;font-weight:900;color:#ec4899;text-align:center;line-height:36px;">K</div>
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">Kampas</span>
    </div>
  </div>`;

const BRAND_FOOTER = `
  <hr style="border:none;border-top:1px solid #fce7f3;margin:24px 0;">
  <p style="color:#bbb;font-size:12px;margin:0;">
    You received this email because you have a Kampas account. If this wasn't you, please ignore it.
  </p>`;

export async function sendEmail(to: string, subject: string, html: string) {
  const config = await getEmailConfig();

  // ── Prefer Brevo REST API (v3) if API key is set ──────────────────────────
  if (config.apiKey) {
    const axios = (await import('axios')).default;
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender:  { name: config.senderName, email: config.senderEmail },
        to:      [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          'api-key':      config.apiKey,
          'Content-Type': 'application/json',
        },
      },
    );
    return;
  }

  // ── Fall back to SMTP if SMTP credentials are set ─────────────────────────
  if (config.smtpUser && config.smtpPass) {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
    const FROM = `"${config.senderName}" <${config.senderEmail}>`;
    await transporter.sendMail({ from: FROM, to, subject, html });
    return;
  }

  console.warn('[email] No Brevo credentials configured — skipping email send');
}

export const sendVerificationLinkEmail = async (to: string, name: string, verifyUrl: string) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #fce7f3;">
      ${BRAND_HEADER}
      <div style="padding:32px;background:#fff;">
        <h2 style="color:#111;margin:0 0 8px;font-size:22px;">Verify your email address</h2>
        <p style="color:#555;margin:0 0 24px;font-size:15px;">Hi <strong>${name}</strong>, click the button below to confirm your email and activate your Kampas account.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#ec4899;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;margin-bottom:24px;">Verify my email</a>
        <p style="color:#888;font-size:13px;margin:8px 0 0;">This link expires in <strong>24 hours</strong>. If you didn't create a Kampas account, you can safely ignore this email.</p>
        ${BRAND_FOOTER}
      </div>
    </div>`;
  await sendEmail(to, 'Confirm your email — Kampas', html);
};

export const sendWelcomeEmail = async (to: string, name: string) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #fce7f3;">
      ${BRAND_HEADER}
      <div style="padding:32px;background:#fff;">
        <h2 style="color:#111;margin:0 0 8px;font-size:22px;">Welcome to Kampas! 🎉</h2>
        <p style="color:#555;margin:0 0 16px;font-size:15px;">Hi <strong>${name}</strong>, your account is verified and ready to go.</p>
        <p style="color:#555;margin:0 0 24px;font-size:15px;">You can now buy, sell, find housing, and explore campus events — all in one place built for Kenyan students.</p>
        <a href="https://kampas.co.ke/explore" style="display:inline-block;background:#ec4899;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Explore Kampas</a>
        ${BRAND_FOOTER}
      </div>
    </div>`;
  await sendEmail(to, 'Welcome to Kampas — you\'re all set!', html);
};

export const sendVerificationOTPEmail = async (to: string, name: string, otp: string) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #fce7f3;">
      ${BRAND_HEADER}
      <div style="padding:32px;background:#fff;">
        <h2 style="color:#111;margin:0 0 8px;font-size:22px;">Verify your email</h2>
        <p style="color:#555;margin:0 0 24px;font-size:15px;">Hi <strong>${name}</strong>, enter this code in the app to activate your Kampas account.</p>
        <div style="background:#fdf2f8;border:2px dashed #f9a8d4;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
          <span style="font-size:44px;font-weight:900;letter-spacing:14px;color:#ec4899;font-variant-numeric:tabular-nums;">${otp}</span>
        </div>
        <p style="color:#888;font-size:13px;margin:0;">Expires in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        ${BRAND_FOOTER}
      </div>
    </div>`;
  await sendEmail(to, 'Your Kampas verification code', html);
};

export const sendPasswordResetEmail = async (to: string, name: string, resetUrl: string) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #fce7f3;">
      ${BRAND_HEADER}
      <div style="padding:32px;background:#fff;">
        <h2 style="color:#111;margin:0 0 8px;font-size:22px;">Reset your password</h2>
        <p style="color:#555;margin:0 0 24px;font-size:15px;">Hi <strong>${name}</strong>, we received a request to reset your Kampas password. Click the button below to choose a new one.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#ec4899;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;margin-bottom:24px;">Reset my password</a>
        <p style="color:#888;font-size:13px;margin:8px 0 0;">⏱ This link expires in <strong>10 minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
        <p style="color:#bbb;font-size:12px;margin:16px 0 0;word-break:break-all;">Or copy this link into your browser:<br>${resetUrl}</p>
        ${BRAND_FOOTER}
      </div>
    </div>`;
  await sendEmail(to, 'Reset your Kampas password', html);
};

export const sendOrderStatusEmail = async (to: string, name: string, orderId: string, status: string) => {
  const statusMessages: Record<string, string> = {
    CONFIRMED:  'Your order has been confirmed by the seller.',
    PROCESSING: 'Your order is being prepared.',
    SHIPPED:    'Your order is on its way!',
    DELIVERED:  'Your order has been delivered. Enjoy!',
    CANCELLED:  'Your order has been cancelled.',
  };
  const msg = statusMessages[status] ?? `Your order status has been updated to ${status}.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #fce7f3;">
      ${BRAND_HEADER}
      <div style="padding:32px;background:#fff;">
        <h2 style="color:#111;margin:0 0 8px;font-size:22px;">Order Update</h2>
        <p style="color:#555;margin:0 0 16px;font-size:15px;">Hi <strong>${name}</strong>, ${msg}</p>
        <p style="color:#888;font-size:13px;margin:0 0 24px;">Order reference: <strong>${orderId}</strong></p>
        <a href="https://kampas.co.ke/dashboard/buyer" style="display:inline-block;background:#ec4899;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">View Order</a>
        ${BRAND_FOOTER}
      </div>
    </div>`;
  await sendEmail(to, `Kampas Order Update — ${status}`, html);
};

export const sendSellerAnnouncementEmail = async (to: string, name: string, subject: string, body: string) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #fce7f3;">
      ${BRAND_HEADER}
      <div style="padding:32px;background:#fff;">
        <h2 style="color:#111;margin:0 0 16px;font-size:22px;">${subject}</h2>
        <p style="color:#555;margin:0 0 8px;font-size:15px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#555;margin:0 0 24px;font-size:15px;">${body}</p>
        ${BRAND_FOOTER}
      </div>
    </div>`;
  await sendEmail(to, subject, html);
};

export const sendSecurityAlertEmail = async (to: string, name: string, message: string) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border-radius:16px;overflow:hidden;border:1px solid #fce7f3;">
      ${BRAND_HEADER}
      <div style="padding:32px;background:#fff;">
        <h2 style="color:#111;margin:0 0 8px;font-size:22px;">Security Alert</h2>
        <p style="color:#555;margin:0 0 24px;font-size:15px;">Hi <strong>${name}</strong>, ${message}</p>
        <p style="color:#888;font-size:13px;margin:0;">If this wasn't you, please reset your password immediately.</p>
        ${BRAND_FOOTER}
      </div>
    </div>`;
  await sendEmail(to, 'Kampas Security Alert', html);
};
