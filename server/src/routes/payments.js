import { Router } from 'express';
import Stripe from 'stripe';
import { requireRoles } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

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
    if (apt.clientId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
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
