/**
 * SMTP email via Nodemailer. Configure with env vars; if not set, sendMail is a no-op.
 * Use any SMTP provider: Resend, SendGrid, Gmail (App Password), Brevo, etc.
 * Nodemailer is loaded lazily so a bad import does not crash server startup.
 */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@foreverfaded.com';

let transporter = null;
let nodemailerModule = null;

async function getNodemailer() {
  if (nodemailerModule) return nodemailerModule;
  nodemailerModule = (await import('nodemailer')).default;
  return nodemailerModule;
}

async function getTransport() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const nodemailer = await getNodemailer();
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * Send an email. Returns { sent: true } or { sent: false, error }.
 * If SMTP is not configured, returns { sent: false } and does not throw.
 */
export async function sendMail({ to, subject, text, html }) {
  const transport = await getTransport();
  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[email] SMTP not configured; skipping send. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
    }
    return { sent: false };
  }
  try {
    const from = MAIL_FROM.includes('<') ? MAIL_FROM : `Forever Faded <${MAIL_FROM}>`;
    await transport.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject || 'Forever Faded',
      text: text || '',
      html: html || (text ? text.replace(/\n/g, '<br>') : ''),
    });
    return { sent: true };
  } catch (err) {
    const msg = (err.response && (err.response.slice ? err.response : String(err.response))) || err.message || String(err);
    console.error('[email] send failed:', msg);
    return { sent: false, error: msg };
  }
}

/** Check if SMTP is configured (for optional features like "send confirmation email"). */
export function isEmailConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}
