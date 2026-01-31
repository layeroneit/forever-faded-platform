import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

export const locationsRouter = Router();

const LOCATION_PATCH_FIELDS = ['name', 'address', 'city', 'state', 'zip', 'phone', 'timezone', 'isActive'];

// GET /api/locations — clients: active only; owner/admin: all (for management)
locationsRouter.get('/', async (req, res) => {
  const isOwnerOrAdmin = req.role === 'owner' || req.role === 'admin';
  const where = isOwnerOrAdmin ? {} : { isActive: true };
  if (!isOwnerOrAdmin && req.locationId) where.id = req.locationId;
  const locations = await prisma.location.findMany({ where, orderBy: { name: 'asc' } });
  res.json(locations);
});

// GET /api/locations/:id
locationsRouter.get('/:id', param('id').notEmpty(), async (req, res) => {
  if (validationError(req, res)) return;
  const loc = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  res.json(loc);
});

// POST /api/locations — owner/admin
locationsRouter.post(
  '/',
  requireRoles('owner', 'admin'),
  body('name').trim().notEmpty(),
  body('address').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('state').optional().trim(),
  body('zip').optional().trim(),
  body('phone').optional().trim(),
  body('timezone').optional().trim(),
  async (req, res) => {
    if (validationError(req, res)) return;
    const location = await prisma.location.create({ data: req.body });
    res.status(201).json(location);
  }
);

// PATCH /api/locations/:id — owner/admin; only allowed fields
locationsRouter.patch('/:id', requireRoles('owner', 'admin'), param('id').notEmpty(), async (req, res) => {
  if (validationError(req, res)) return;
  const data = {};
  for (const k of LOCATION_PATCH_FIELDS) if (req.body[k] !== undefined) data[k] = req.body[k];
  const location = await prisma.location.update({
    where: { id: req.params.id },
    data,
  });
  res.json(location);
});
