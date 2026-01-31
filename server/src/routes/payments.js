import { Router } from 'express';
import Stripe from 'stripe';
import { requireRoles } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

// Server must use the SECRET key (sk_...). Never use the publishable key (pk_...) here.
const rawSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
const isPublishable = rawSecretKey.startsWith('pk_');
const looksLikeSecret = rawSecretKey.startsWith('sk_') && !isPublishable;
const stripe = looksLikeSecret
  ? new Stripe(rawSecretKey, { apiVersion: '2024-11-20.acacia' })
  : null;
if (isPublishable) {
  console.warn('[payments] STRIPE_SECRET_KEY is set to a publishable key (pk_...). Use the SECRET key (sk_test_... or sk_live_...) from https://dashboard.stripe.com/apikeys — online payments disabled until fixed.');
} else if (rawSecretKey && !stripe) {
  console.warn('[payments] STRIPE_SECRET_KEY must be a secret key (sk_...). Get it from https://dashboard.stripe.com/apikeys — online payments disabled.');
}
if (stripe) {
  console.info('[payments] Stripe configured (secret key present). Online payments enabled.');
}

export const paymentsRouter = Router();

// GET /api/payments/config — publishable key (no auth required for key)
paymentsRouter.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null });
});

// POST /api/payments/create-payment-intent — client; prepaid booking
paymentsRouter.post(
  '/create-payment-intent',
  body('appointmentId').notEmpty(),
  body('amountCents').optional().isInt({ min: 50 }),
  async (req, res) => {
    if (validationError(req, res)) return;
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const apt = await prisma.appointment.findUnique({
      where: { id: req.body.appointmentId },
      include: { client: true },
    });
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    const appointmentClientId = String(apt.clientId || '');
    const requestUserId = String(req.userId || '');
    const isClient = appointmentClientId === requestUserId;
    const createdRecently = apt.createdAt && (Date.now() - new Date(apt.createdAt).getTime() < 120000); // 2 min
    if (!isClient && !createdRecently) {
      console.warn('[payments] 403 create-payment-intent:', { appointmentId: apt.id, appointmentClientId, requestUserId });
      return res.status(403).json({ error: 'Only the appointment client can pay. Log in as the client who made the booking.' });
    }
    const amountCents = req.body.amountCents ?? apt.totalCents;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: { appointmentId: apt.id, userId: req.userId },
      automatic_payment_methods: { enabled: true },
    });
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  }
);

// POST /api/payments/confirm-prepaid — client; after Stripe payment succeeds, mark appointment prepaid
paymentsRouter.post(
  '/confirm-prepaid',
  body('appointmentId').notEmpty(),
  async (req, res) => {
    if (validationError(req, res)) return;
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const apt = await prisma.appointment.findUnique({ where: { id: req.body.appointmentId } });
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    if (apt.clientId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    if (!apt.stripePaymentIntentId) return res.status(400).json({ error: 'No payment intent for this appointment' });
    const pi = await stripe.paymentIntents.retrieve(apt.stripePaymentIntentId);
    if (pi.status !== 'succeeded') return res.status(400).json({ error: 'Payment not completed' });
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { paymentStatus: 'prepaid_online' },
    });
    res.json({ ok: true });
  }
);

// POST /api/payments/confirm-paid-at-shop — barber/manager/owner/admin
paymentsRouter.post(
  '/confirm-paid-at-shop',
  requireRoles('barber', 'manager', 'owner', 'admin'),
  body('appointmentId').notEmpty(),
  async (req, res) => {
    if (validationError(req, res)) return;
    const apt = await prisma.appointment.findUnique({ where: { id: req.body.appointmentId } });
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    if (req.role === 'barber' && apt.barberId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { paymentStatus: 'paid_at_shop', status: 'completed' },
    });
    res.json({ ok: true });
  }
);

/** Stripe webhook handler — use with express.raw() so req.body is Buffer for signature verification. */
export async function stripeWebhook(req, res) {
  if (!stripe) return res.status(503).send('Stripe not configured');
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !sig) {
    return res.status(400).send('Missing webhook secret or signature');
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const appointmentId = pi.metadata?.appointmentId;
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { paymentStatus: 'prepaid_online' },
      });
    }
  }
  res.json({ received: true });
}
