import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';

export const servicesRouter = Router();

// GET /api/services?locationId=xxx - list services (optionally by location)
servicesRouter.get('/', query('locationId').optional(), async (req, res) => {
  const where = { isActive: true };
  if (req.query.locationId) where.locationId = req.query.locationId;
  const services = await prisma.service.findMany({
    where,
    include: { location: { select: { id: true, name: true } } },
    orderBy: [{ location: { name: 'asc' } }, { name: 'asc' }],
  });
  res.json(services);
});

// GET /api/services/:id
servicesRouter.get('/:id', param('id').notEmpty(), async (req, res) => {
  const svc = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: { location: true },
  });
  if (!svc) return res.status(404).json({ error: 'Service not found' });
  res.json(svc);
});

// POST /api/services - owner/admin/manager
servicesRouter.post(
  '/',
  requireRoles('owner', 'admin', 'manager'),
  body('locationId').notEmpty(),
  body('name').trim().notEmpty(),
  body('description').optional().trim(),
  body('durationMinutes').isInt({ min: 5 }),
  body('priceCents').isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const service = await prisma.service.create({ data: req.body });
    res.status(201).json(service);
  }
);

// PATCH /api/services/:id
servicesRouter.patch(
  '/:id',
  requireRoles('owner', 'admin', 'manager'),
  param('id').notEmpty(),
  async (req, res) => {
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(service);
  }
);
