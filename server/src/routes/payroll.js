import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, query } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

export const payrollRouter = Router();

// GET /api/payroll?locationId=&userId=
payrollRouter.get('/', query('locationId').optional(), query('userId').optional(), async (req, res) => {
  const where = {};
  if (req.role === 'barber') where.userId = req.userId;
  else if (req.locationId) where.locationId = req.locationId;
  if (req.query.locationId) where.locationId = req.query.locationId;
  if (req.query.userId) where.userId = req.query.userId;
  const entries = await prisma.payrollEntry.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ periodEnd: 'desc' }, { userId: 'asc' }],
  });
  res.json(entries);
});

// POST /api/payroll — owner/admin
payrollRouter.post(
  '/',
  requireRoles('owner', 'admin'),
  body('userId').notEmpty(),
  body('locationId').notEmpty(),
  body('periodStart').isISO8601(),
  body('periodEnd').isISO8601(),
  body('commissionRatePercent').isInt({ min: 0, max: 100 }),
  body('grossCents').isInt({ min: 0 }),
  body('commissionCents').isInt({ min: 0 }),
  async (req, res) => {
    if (validationError(req, res)) return;
    const entry = await prisma.payrollEntry.create({
      data: req.body,
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(entry);
  }
);

// PATCH /api/payroll/:id — mark paid (sets paidAt to now)
payrollRouter.patch('/:id', requireRoles('owner', 'admin'), param('id').notEmpty(), async (req, res) => {
  if (validationError(req, res)) return;
  const entry = await prisma.payrollEntry.update({
    where: { id: req.params.id },
    data: { paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date() },
    include: { user: { select: { id: true, name: true } } },
  });
  res.json(entry);
});
