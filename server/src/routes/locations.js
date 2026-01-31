import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';

export const locationsRouter = Router();

// GET /api/locations - list (clients see active; staff/owner see all for their scope)
locationsRouter.get('/', async (req, res) => {
  const isStaff = ['barber', 'manager', 'owner', 'admin'].includes(req.role);
  const where = isStaff && req.locationId ? { id: req.locationId } : { isActive: true };
  const locations = await prisma.location.findMany({ where, orderBy: { name: 'asc' } });
  res.json(locations);
});

// GET /api/locations/:id
locationsRouter.get('/:id', param('id').notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const loc = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  res.json(loc);
});

// POST /api/locations - owner/admin only
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const location = await prisma.location.create({ data: req.body });
    res.status(201).json(location);
  }
);

// PATCH /api/locations/:id - owner/admin only
locationsRouter.patch(
  '/:id',
  requireRoles('owner', 'admin'),
  param('id').notEmpty(),
  async (req, res) => {
    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(location);
  }
);
