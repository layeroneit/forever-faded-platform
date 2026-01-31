import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, query } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';
import { sendMail, isEmailConfigured } from '../lib/email.js';

export const appointmentsRouter = Router();

const APPOINTMENT_INCLUDE = {
  client: { select: { id: true, name: true, email: true } },
  barber: { select: { id: true, name: true } },
  service: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
  location: { select: { id: true, name: true, address: true } },
};

// GET /api/appointments?locationId=&from=&to=
appointmentsRouter.get('/', query('locationId').optional(), query('from').optional(), query('to').optional(), async (req, res) => {
  const where = {};
  if (req.role === 'client') where.clientId = req.userId;
  else if (req.role === 'barber' || req.role === 'manager') {
    where.barberId = req.userId;
    if (req.locationId) where.locationId = req.locationId;
  }
  // owner/admin see all locations unless filtering by query
  if (req.query.locationId) where.locationId = req.query.locationId;
  else if (req.role !== 'owner' && req.role !== 'admin' && req.locationId) where.locationId = req.locationId;
  if (req.query.from) where.startAt = { ...where.startAt, gte: new Date(req.query.from) };
  if (req.query.to) where.startAt = { ...where.startAt, lte: new Date(req.query.to) };
  const appointments = await prisma.appointment.findMany({
    where,
    include: APPOINTMENT_INCLUDE,
    orderBy: { startAt: 'asc' },
  });
  res.json(appointments);
});

// GET /api/appointments/:id
appointmentsRouter.get('/:id', param('id').notEmpty(), async (req, res) => {
  if (validationError(req, res)) return;
  const apt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { client: true, barber: true, service: true, location: true },
  });
  if (!apt) return res.status(404).json({ error: 'Appointment not found' });
  if (req.role === 'client' && apt.clientId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  if ((req.role === 'barber' || req.role === 'manager') && apt.barberId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  res.json(apt);
});

// POST /api/appointments — clientId optional (defaults to self for clients)
appointmentsRouter.post(
  '/',
  body('locationId').notEmpty(),
  body('clientId').optional(),
  body('barberId').notEmpty(),
  body('serviceId').notEmpty(),
  body('startAt').isISO8601(),
  body('notes').optional().trim(),
  async (req, res) => {
    if (validationError(req, res)) return;
    // Clients can only book for themselves (use JWT userId so payment intent 403 is avoided)
    const clientId = req.role === 'client' ? req.userId : (req.body.clientId || null);
    if (!clientId) return res.status(400).json({ error: 'clientId required' });
    const service = await prisma.service.findUnique({ where: { id: req.body.serviceId } });
    if (!service) return res.status(400).json({ error: 'Service not found' });
    const startAt = new Date(req.body.startAt);
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000);
    const appointment = await prisma.appointment.create({
      data: {
        locationId: req.body.locationId,
        clientId,
        barberId: req.body.barberId,
        serviceId: req.body.serviceId,
        startAt,
        endAt,
        totalCents: service.priceCents,
        notes: req.body.notes ?? null,
      },
      include: APPOINTMENT_INCLUDE,
    });

    // Send confirmation email if SMTP is configured (fire-and-forget, log result)
    if (isEmailConfigured() && appointment.client?.email) {
      const dateStr = startAt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const timeStr = startAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      const priceStr = `$${(appointment.totalCents / 100).toFixed(2)}`;
      const text = [
        `Hi ${appointment.client.name},`,
        '',
        'Your appointment at Forever Faded is confirmed.',
        '',
        `Service: ${appointment.service?.name}`,
        `Date: ${dateStr} at ${timeStr}`,
        `Location: ${appointment.location?.name}`,
        appointment.location?.address ? `Address: ${appointment.location.address}` : null,
        `Barber: ${appointment.barber?.name}`,
        `Total: ${priceStr}`,
        '',
        'See you soon!',
      ].filter(Boolean).join('\n');
      sendMail({
        to: appointment.client.email,
        subject: 'Appointment confirmed — Forever Faded',
        text,
        html: text.replace(/\n/g, '<br>'),
      })
        .then((r) => {
          if (r.sent) console.log('[appointments] confirmation email sent to', appointment.client.email);
          else console.error('[appointments] confirmation email failed:', r.error || 'unknown');
        })
        .catch((err) => console.error('[appointments] confirmation email error:', err.message));
    }

    res.status(201).json(appointment);
  }
);

// POST /api/appointments/:id/cancel — client cancels own; staff can cancel/no-show
appointmentsRouter.post(
  '/:id/cancel',
  param('id').notEmpty(),
  body('reason').optional().isIn(['cancelled', 'no_show']),
  async (req, res) => {
    if (validationError(req, res)) return;
    const apt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { client: true, service: true, location: true },
    });
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    const isClient = req.role === 'client' && apt.clientId === req.userId;
    const isStaff = ['barber', 'manager', 'owner', 'admin'].includes(req.role);
    const barberAccess = req.role === 'barber' && apt.barberId === req.userId;

    if (isClient) {
      if (!['pending', 'confirmed'].includes(apt.status)) return res.status(400).json({ error: 'Only pending or confirmed appointments can be cancelled' });
      const updated = await prisma.appointment.update({
        where: { id: apt.id },
        data: { status: 'cancelled', cancelledAt: new Date() },
        include: APPOINTMENT_INCLUDE,
      });
      return res.json(updated);
    }
    if (isStaff && (req.role !== 'barber' || barberAccess)) {
      const reason = req.body.reason === 'no_show' ? 'no_show' : 'cancelled';
      const data = { status: reason, cancelledAt: new Date() };
      if (apt.paymentStatus === 'prepaid_online') data.paymentStatus = 'refunded';
      const updated = await prisma.appointment.update({
        where: { id: apt.id },
        data,
        include: APPOINTMENT_INCLUDE,
      });
      return res.json(updated);
    }
    return res.status(403).json({ error: 'You cannot cancel this appointment' });
  }
);

// PATCH /api/appointments/:id — status, paymentStatus, notes, discountCents, refundCents (staff)
appointmentsRouter.patch(
  '/:id',
  requireRoles('barber', 'manager', 'owner', 'admin'),
  param('id').notEmpty(),
  body('status').optional().isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  body('paymentStatus').optional().isIn(['unpaid', 'paid_at_shop', 'prepaid_online', 'refunded']),
  body('notes').optional().trim(),
  body('discountCents').optional().isInt({ min: 0 }),
  body('refundCents').optional().isInt({ min: 0 }),
  async (req, res) => {
    if (validationError(req, res)) return;
    const apt = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    if (req.role === 'barber' && apt.barberId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const data = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.paymentStatus !== undefined) data.paymentStatus = req.body.paymentStatus;
    if (req.body.notes !== undefined) data.notes = req.body.notes;
    if (req.body.discountCents !== undefined) data.discountCents = req.body.discountCents;
    if (req.body.refundCents !== undefined) {
      data.refundCents = req.body.refundCents;
      data.refundedAt = new Date();
      data.refundedBy = req.userId;
      if (req.body.refundCents > 0) data.paymentStatus = 'refunded';
    }
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
      include: { client: { select: { id: true, name: true, email: true, phone: true } }, barber: { select: { id: true, name: true } }, service: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
    });
    res.json(updated);
  }
);
