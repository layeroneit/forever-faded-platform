import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, query } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

export const servicesRouter = Router();

const SERVICE_PATCH_FIELDS = ['name', 'category', 'description', 'durationMinutes', 'priceCents', 'isActive', 'locationId'];

// GET /api/services?locationId=xxx&all=1 — locationId: return services for that location OR global (null). No locationId: return all (owner list).
servicesRouter.get('/', query('locationId').optional(), query('all').optional(), async (req, res) => {
  const where = {};
  const showInactive = req.query.all === '1' && ['owner', 'admin', 'manager'].includes(req.role);
  if (!showInactive) where.isActive = true;
  if (req.query.locationId) {
    where.OR = [
      { locationId: req.query.locationId },
      { locationId: null },
    ];
  }
  const services = await prisma.service.findMany({
    where,
    include: { location: { select: { id: true, name: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json(services);
});

// GET /api/services/:id
servicesRouter.get('/:id', param('id').notEmpty(), async (req, res) => {
  if (validationError(req, res)) return;
  const svc = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: { location: true },
  });
  if (!svc) return res.status(404).json({ error: 'Service not found' });
  res.json(svc);
});

// POST /api/services — owner/admin/manager
servicesRouter.post(
  '/',
  requireRoles('owner', 'admin', 'manager'),
  body('locationId').optional(),
  body('name').trim().notEmpty(),
  body('category').optional().trim(),
  body('description').optional().trim(),
  body('durationMinutes').isInt({ min: 5 }),
  body('priceCents').isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  async (req, res) => {
    if (validationError(req, res)) return;
    const data = { ...req.body, locationId: req.body.locationId || null };
    const service = await prisma.service.create({ data });
    res.status(201).json(service);
  }
);

// PATCH /api/services/:id — only allowed fields
servicesRouter.patch('/:id', requireRoles('owner', 'admin', 'manager'), param('id').notEmpty(), async (req, res) => {
  if (validationError(req, res)) return;
  const data = {};
  for (const k of SERVICE_PATCH_FIELDS) if (req.body[k] !== undefined) data[k] = req.body[k];
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data,
  });
  res.json(service);
});
