import nodemailer from 'nodemailer';
// import { Resend } from 'resend'; // Disabled: using Nodemailer (SMTP) instead of Resend
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// ── Email Client Initialization ──────────────────────────────────────────────
let transporter = null;
// let resendClient = null; // Disabled: Resend client setup commented out

logger.info('Email: Using Nodemailer (SMTP Transporter)');

function getTransporter() {
  if (!transporter) {
    const rawUser = process.env.SMTP_USER;
    const rawPass = process.env.SMTP_PASS;
    if (!rawUser || !rawPass) {
      throw ApiError.internal('Email service not configured — add SMTP_USER and SMTP_PASS to environment variables');
    }
    const cleanUser = String(rawUser).replace(/['"]+/g, '').trim();
    const cleanPass = String(rawPass).replace(/['"\s]+/g, '').trim();
    const service   = (process.env.SMTP_SERVICE || 'gmail').toLowerCase().trim();
    const host      = process.env.SMTP_HOST;
    const port      = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const secure    = process.env.SMTP_SECURE === 'true';

    if (host) {
      transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: secure || false,
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,
        socketTimeout: 15000,
        greetingTimeout: 15000,
      });
    } else {
      transporter = nodemailer.createTransport({
        service: service || 'gmail',
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,
        socketTimeout: 15000,
        greetingTimeout: 15000,
      });
    }
  }
  return transporter;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Generate and Save OTP ───────────────────────────────────────────────────
export async function generateAndSaveOtp(email) {
  await prisma.otpVerification.deleteMany({ where: { email, used: false } });

  const otp       = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpVerification.create({ data: { email, otp, expiresAt } });
  return otp;
}

// ── Send Verification Email ──────────────────────────────────────────────────
export async function sendVerificationEmail(email, code) {
  const subject  = `${code} — Your SkillSphere verification code`;
  const fromAddr = process.env.SMTP_FROM || process.env.RESEND_FROM || `"SkillSphere" <${process.env.SMTP_USER}>`;
  const html     = `
      <div style="font-family: monospace; background: #050505; color: #e2e8f0; padding: 40px; max-width: 480px;">
        <h1 style="color: #22d3ee; font-size: 24px; margin-bottom: 8px;">SKILLSPHERE</h1>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 32px;">IDENTITY_VERIFICATION_PROTOCOL</p>
        <p style="color: #e2e8f0; margin-bottom: 16px;">Your verification code is:</p>
        <div style="background: #111827; border: 1px solid #22d3ee; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px; font-weight: 900; color: #22d3ee; letter-spacing: 12px;">${code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">This code expires in <strong style="color: #fbbf24;">10 minutes</strong>.</p>
        <hr style="border: none; border-top: 1px solid #1f2937; margin: 24px 0;" />
        <p style="color: #374151; font-size: 11px;">SKILLSPHERE_OS v2.0 /// SYSTEM SECURE</p>
      </div>
    `;

  try {
    /* Resend block disabled
    if (resendClient) {
      const response = await resendClient.emails.send({ from: fromAddr, to: email, subject, html });
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      logger.info('Verification email sent via Resend', { email });
    } else
    */
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await getTransporter().sendMail({ from: fromAddr, to: email, subject, html });
      logger.info('Verification email sent via Nodemailer (SMTP)', { email });
    } else {
      logger.warn(`Email service not configured. Verification email generated in Demo/Mock Mode. OTP Code: ${code}`, { email, code });
    }
  } catch (err) {
    logger.error('Failed to send verification email', { err: err.message, email });
    
    // Graceful fallback: check if we are running in demo mode, development, or if email options are omitted
    const demoVar = process.env.DEMO_MODE || process.env.PORTFOLIO_MODE;
    const isDemo = String(demoVar).toLowerCase().trim() === 'true' || 
                   demoVar === true || 
                   demoVar === '1' || 
                   process.env.NODE_ENV === 'development' ||
                   (!process.env.SMTP_USER || !process.env.SMTP_PASS);
                   
    if (isDemo) {
      logger.warn(`Email delivery failed/unconfigured, but running in Demo/Mock Mode. Proceeding with OTP database log. OTP Code: ${code}`, { email });
    } else {
      await prisma.otpVerification.deleteMany({ where: { email, used: false } });
      throw ApiError.internal('Failed to send verification email');
    }
  }

  return { sent: true };
}

// ── Send OTP email (wrapper) ──────────────────────────────────────────────────
export async function sendOtp(email) {
  const code = await generateAndSaveOtp(email);
  return sendVerificationEmail(email, code);
}

// ── Verify OTP ────────────────────────────────────────────────────────────────
export async function verifyOtp(email, otp) {
  // Allow universal code in demo mode for portfolio showcasing, or if email service is not configured
  const demoVar = process.env.DEMO_MODE || process.env.PORTFOLIO_MODE;
  const isDemo = String(demoVar).toLowerCase().trim() === 'true' || 
                 demoVar === true || 
                 demoVar === '1' || 
                 (!process.env.SMTP_USER || !process.env.SMTP_PASS);
  
  logger.info('OTP Verification debug', { 
    email, 
    otpReceived: otp, 
    rawDemoVar: demoVar,
    demoVarType: typeof demoVar,
    isDemoCalculated: isDemo 
  });
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

// ── Send Feedback Email ──────────────────────────────────────────────────────
export async function sendFeedbackEmail({ user, category, rating, feedback, mostValuable, improvement, deviceInfo }) {
  const cleanUser = (process.env.SMTP_USER || '').replace(/['"]+/g, '').trim();
  const rawAdmin  = process.env.ADMIN_FEEDBACK_EMAIL ? process.env.ADMIN_FEEDBACK_EMAIL.replace(/['"]+/g, '').trim() : '';

  // Collect and deduplicate all destination admin emails
  const emailSet = new Set(['kshitizd171@gmail.com', 'kshitijdhyani07@gmail.com']);
  if (cleanUser) emailSet.add(cleanUser);
  if (rawAdmin)  emailSet.add(rawAdmin);
  const targetEmails = Array.from(emailSet);

  const subject = `[SkillSphere Feedback] ${category || 'General'} · from ${user.name || 'User'} (${rating || 5}/5 ⭐)`;
  const fromAddr = process.env.SMTP_FROM || `"SkillSphere Feedback" <${cleanUser || 'noreply@skillsphere.com'}>`;

  const starIcons = '⭐'.repeat(Math.max(1, Math.min(5, Number(rating) || 5)));

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #F5F2EB; color: #111111; padding: 32px 16px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #D5D1C8; border-top: 4px solid #6D28D9; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(90,85,80,0.08);">
        
        <!-- Header -->
        <div style="background: #FAF7F0; padding: 24px; border-bottom: 1px solid #EAE6DC;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #6D28D9; background: #F5F3FF; padding: 4px 10px; border-radius: 4px; border: 1px solid #DDD6FE;">
              ${category || 'User Feedback'}
            </span>
            <span style="font-size: 16px;">${starIcons}</span>
          </div>
          <h2 style="margin: 12px 0 4px 0; font-size: 20px; font-weight: 800; color: #111111;">
            New Platform Feedback
          </h2>
          <p style="margin: 0; font-size: 13px; color: #5C5752;">
            Submitted on ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST
          </p>
        </div>

        <!-- User Information Box -->
        <div style="padding: 20px 24px; background: #FFFFFF; border-bottom: 1px solid #F0EDE4;">
          <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #5C5752;">
            👤 User Details
          </h3>
          <table style="width: 100%; font-size: 13px; line-height: 1.6; border-collapse: collapse;">
            <tr>
              <td style="width: 120px; color: #5C5752; font-weight: 600; padding: 4px 0;">Name:</td>
              <td style="color: #111111; font-weight: 700; padding: 4px 0;">${user.name || 'Anonymous'}</td>
            </tr>
            <tr>
              <td style="color: #5C5752; font-weight: 600; padding: 4px 0;">Email:</td>
              <td style="color: #111111; padding: 4px 0;"><a href="mailto:${user.email}" style="color: #6D28D9; text-decoration: none;">${user.email}</a></td>
            </tr>
            <tr>
              <td style="color: #5C5752; font-weight: 600; padding: 4px 0;">College / Campus:</td>
              <td style="color: #111111; padding: 4px 0;">${user.college || 'Not Specified'}</td>
            </tr>
            <tr>
              <td style="color: #5C5752; font-weight: 600; padding: 4px 0;">Role:</td>
              <td style="color: #111111; padding: 4px 0;">${user.role || 'STUDENT'}</td>
            </tr>
            <tr>
              <td style="color: #5C5752; font-weight: 600; padding: 4px 0;">User ID:</td>
              <td style="color: #5C5752; font-size: 11px; font-family: monospace; padding: 4px 0;">${user.id}</td>
            </tr>
          </table>
        </div>

        <!-- Core Feedback Content -->
        <div style="padding: 24px;">
          <h3 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #5C5752;">
            💬 Detailed Feedback
          </h3>
          <div style="background: #FAF7F0; border: 1px solid #EAE6DC; border-radius: 6px; padding: 16px; font-size: 14px; line-height: 1.6; color: #111111; white-space: pre-wrap;">${feedback}</div>

          ${mostValuable ? `
            <div style="margin-top: 18px;">
              <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #3A3633;">✨ Most Valuable Feature:</h4>
              <p style="margin: 0; font-size: 13px; color: #111111; background: #FFFFFF; border: 1px solid #EAE6DC; border-radius: 4px; padding: 10px 12px;">${mostValuable}</p>
            </div>
          ` : ''}

          ${improvement ? `
            <div style="margin-top: 16px;">
              <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #3A3633;">🛠️ Suggested Improvement / Next Feature:</h4>
              <p style="margin: 0; font-size: 13px; color: #111111; background: #FFFFFF; border: 1px solid #EAE6DC; border-radius: 4px; padding: 10px 12px;">${improvement}</p>
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="background: #FAF7F0; padding: 14px 24px; border-top: 1px solid #EAE6DC; font-size: 11px; color: #5C5752; display: flex; justify-content: space-between;">
          <span>SkillSphere Intelligence Platform</span>
          <span>${deviceInfo || 'Web Client'}</span>
        </div>

      </div>
    </div>
  `;

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Send to all admin emails concurrently
      const sendPromises = targetEmails.map((destEmail) =>
        getTransporter().sendMail({
          from: fromAddr,
          to: destEmail,
          subject,
          html,
          replyTo: user.email,
        })
      );
      await Promise.allSettled(sendPromises);
      logger.info('Feedback email delivered successfully to admin inboxes', { fromUser: user.email, targetEmails });
    } else {
      logger.warn('Email service unconfigured: logged feedback in mock mode', { fromUser: user.email, category, rating, feedback });
    }
  } catch (err) {
    logger.error('Failed to send feedback email via SMTP', { err: err.message });
    // Re-throw so route knows
    throw ApiError.internal('Failed to deliver feedback email via SMTP transport');
  }

  return { success: true };
}