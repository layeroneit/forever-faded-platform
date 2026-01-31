import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, query } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

export const inventoryRouter = Router();

// GET /api/inventory?locationId=
inventoryRouter.get('/', query('locationId').optional(), async (req, res) => {
  const where = {};
  if (req.query.locationId) where.locationId = req.query.locationId;
  if (req.locationId && !req.query.locationId) where.locationId = req.locationId;
  const items = await prisma.inventoryItem.findMany({
    where,
    include: { location: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(items);
});

// POST /api/inventory — owner/admin/manager
inventoryRouter.post(
  '/',
  requireRoles('owner', 'admin', 'manager'),
  body('locationId').notEmpty(),
  body('name').trim().notEmpty(),
  body('sku').optional().trim(),
  body('quantity').isInt({ min: 0 }),
  body('reorderPoint').optional().isInt({ min: 0 }),
  body('unit').optional().trim(),
  async (req, res) => {
    if (validationError(req, res)) return;
    const item = await prisma.inventoryItem.create({
      data: {
        locationId: req.body.locationId,
        name: req.body.name,
        sku: req.body.sku ?? null,
        quantity: req.body.quantity,
        reorderPoint: req.body.reorderPoint ?? 10,
        unit: req.body.unit || 'each',
      },
    });
    res.status(201).json(item);
  }
);

// PATCH /api/inventory/:id — quantity or change+reason
inventoryRouter.patch(
  '/:id',
  requireRoles('owner', 'admin', 'manager'),
  param('id').notEmpty(),
  body('quantity').optional().isInt({ min: 0 }),
  body('change').optional().isInt(),
  body('reason').optional().trim(),
  async (req, res) => {
    if (validationError(req, res)) return;
    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    let newQty = item.quantity;
    if (req.body.quantity !== undefined) newQty = req.body.quantity;
    else if (req.body.change !== undefined) newQty = item.quantity + req.body.change;
    if (newQty < 0) return res.status(400).json({ error: 'Quantity cannot be negative' });
    const [updated] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: req.params.id },
        data: { quantity: newQty },
      }),
      prisma.inventoryLog.create({
        data: {
          itemId: req.params.id,
          userId: req.userId,
          change: newQty - item.quantity,
          reason: req.body.reason ?? 'adjustment',
        },
      }),
    ]);
    res.json(updated);
  }
);
