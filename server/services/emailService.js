import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// Lazy-init transporter — missing SMTP config fails at send time, not startup
let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw ApiError.internal('Email service not configured — add SMTP_USER and SMTP_PASS to .env');
    }
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Gmail App Password, not your account password
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
  // Clean up any existing unused OTPs for this email before creating a new one
  await prisma.otpVerification.deleteMany({ where: { email, used: false } });

  const otp       = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpVerification.create({ data: { email, otp, expiresAt } });

  const mail = {
    from:    `"SkillSphere" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: `${otp} — Your SkillSphere verification code`,
    html: `
      <div style="font-family: monospace; background: #050505; color: #e2e8f0; padding: 40px; max-width: 480px;">
        <h1 style="color: #22d3ee; font-size: 24px; margin-bottom: 8px;">SKILLSPHERE</h1>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 32px;">IDENTITY_VERIFICATION_PROTOCOL</p>

        <p style="color: #e2e8f0; margin-bottom: 16px;">Your verification code is:</p>

        <div style="background: #111827; border: 1px solid #22d3ee; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px; font-weight: 900; color: #22d3ee; letter-spacing: 12px;">${otp}</span>
        </div>

        <p style="color: #94a3b8; font-size: 12px;">This code expires in <strong style="color: #fbbf24;">10 minutes</strong>.</p>
        <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #1f2937; margin: 24px 0;" />
        <p style="color: #374151; font-size: 11px;">SKILLSPHERE_OS v2.0 /// SYSTEM SECURE</p>
      </div>
    `,
  };

  try {
    await getTransporter().sendMail(mail);
    logger.info('OTP sent', { email });
  } catch (err) {
    logger.error('Failed to send OTP email', { err: err.message, email });
    await prisma.otpVerification.deleteMany({ where: { email, used: false } });
    throw ApiError.internal('Failed to send verification email — check SMTP config');
  }

  return { sent: true };
}

// ── Verify OTP ────────────────────────────────────────────────────────────────
export async function verifyOtp(email, otp) {
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