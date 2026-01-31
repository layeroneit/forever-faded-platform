import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, query } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

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
    const clientId = req.body.clientId || (req.role === 'client' ? req.userId : null);
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
    res.status(201).json(appointment);
  }
);

// PATCH /api/appointments/:id — status, paymentStatus, notes (staff)
appointmentsRouter.patch(
  '/:id',
  requireRoles('barber', 'manager', 'owner', 'admin'),
  param('id').notEmpty(),
  body('status').optional().isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  body('paymentStatus').optional().isIn(['unpaid', 'paid_at_shop', 'prepaid_online', 'refunded']),
  body('notes').optional().trim(),
  async (req, res) => {
    if (validationError(req, res)) return;
    const apt = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    if (req.role === 'barber' && apt.barberId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const data = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.paymentStatus !== undefined) data.paymentStatus = req.body.paymentStatus;
    if (req.body.notes !== undefined) data.notes = req.body.notes;
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
      include: { client: { select: { id: true, name: true } }, barber: { select: { id: true, name: true } }, service: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
    });
    res.json(updated);
  }
);
