import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// ── Email Client Initialization ──────────────────────────────────────────────
let transporter = null;
let resendClient = null;

if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
  logger.info('Email: Using Resend API ✓');
} else {
  logger.info('Email: Using SMTP Transporter');
}

function getTransporter() {
  if (!transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw ApiError.internal('Email service not configured — add RESEND_API_KEY or SMTP config');
    }
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Send OTP email ────────────────────────────────────────────────────────────
export async function sendOtp(email) {
  await prisma.otpVerification.deleteMany({ where: { email, used: false } });

  const otp       = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpVerification.create({ data: { email, otp, expiresAt } });

  const subject = `${otp} — Your SkillSphere verification code`;
  const from    = process.env.RESEND_FROM || `"SkillSphere" <onboarding@resend.dev>`;
  const html    = `
      <div style="font-family: monospace; background: #050505; color: #e2e8f0; padding: 40px; max-width: 480px;">
        <h1 style="color: #22d3ee; font-size: 24px; margin-bottom: 8px;">SKILLSPHERE</h1>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 32px;">IDENTITY_VERIFICATION_PROTOCOL</p>
        <p style="color: #e2e8f0; margin-bottom: 16px;">Your verification code is:</p>
        <div style="background: #111827; border: 1px solid #22d3ee; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px; font-weight: 900; color: #22d3ee; letter-spacing: 12px;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">This code expires in <strong style="color: #fbbf24;">10 minutes</strong>.</p>
        <hr style="border: none; border-top: 1px solid #1f2937; margin: 24px 0;" />
        <p style="color: #374151; font-size: 11px;">SKILLSPHERE_OS v2.0 /// SYSTEM SECURE</p>
      </div>
    `;

  try {
    if (resendClient) {
      await resendClient.emails.send({ from, to: email, subject, html });
    } else {
      await getTransporter().sendMail({ from: `"SkillSphere" <${process.env.SMTP_USER}>`, to: email, subject, html });
    }
    logger.info('OTP sent', { email, provider: resendClient ? 'Resend' : 'SMTP' });
  } catch (err) {
    logger.error('Failed to send OTP email', { err: err.message, email });
    await prisma.otpVerification.deleteMany({ where: { email, used: false } });
    throw ApiError.internal('Failed to send verification email');
  }

  return { sent: true };
}

// ── Verify OTP ────────────────────────────────────────────────────────────────
export async function verifyOtp(email, otp) {
  // Allow universal code in demo mode for portfolio showcasing
  const demoModeVal = process.env.DEMO_MODE;
  const isDemo = String(demoModeVal).toLowerCase().trim() === 'true';
  
  logger.info('OTP Verification attempt', { 
    email, 
    otpReceived: otp, 
    demoModeVar: demoModeVal,
    isDemoCalculated: isDemo 
  });

  if (isDemo && otp === '123456') {
    logger.info('Demo Mode: Bypassing OTP verification', { email });
    return { verified: true };
  }

  const record = await prisma.otpVerification.findFirst({
    where:   { email, otp, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) throw ApiError.badRequest('Invalid verification code');
  if (new Date() > record.expiresAt) throw ApiError.badRequest('Verification code has expired — request a new one');

  await prisma.otpVerification.update({
    where: { id: record.id },
    data:  { used: true },
  });

  return { verified: true };
}