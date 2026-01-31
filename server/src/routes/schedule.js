import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, query } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

export const scheduleRouter = Router();

// GET /api/schedule?userId=&locationId=
scheduleRouter.get('/', query('userId').optional(), query('locationId').optional(), async (req, res) => {
  const where = {};
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.locationId) where.locationId = req.query.locationId;
  if (req.role === 'barber') where.userId = req.userId;
  const slots = await prisma.scheduleSlot.findMany({
    where,
    include: { user: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
    orderBy: [{ userId: 'asc' }, { dayOfWeek: 'asc' }],
  });
  res.json(slots);
});

// POST /api/schedule — upsert slot; barber own, manager/owner any
scheduleRouter.post(
  '/',
  requireRoles('barber', 'manager', 'owner', 'admin'),
  body('userId').optional(),
  body('locationId').notEmpty(),
  body('dayOfWeek').isInt({ min: 0, max: 6 }),
  body('startTime').matches(/^\d{2}:\d{2}$/),
  body('endTime').matches(/^\d{2}:\d{2}$/),
  body('isAvailable').optional().isBoolean(),
  async (req, res) => {
    if (validationError(req, res)) return;
    const userId = req.body.userId || (req.role === 'barber' ? req.userId : null);
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (req.role === 'barber' && userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const slot = await prisma.scheduleSlot.upsert({
      where: {
        userId_locationId_dayOfWeek: {
          userId,
          locationId: req.body.locationId,
          dayOfWeek: req.body.dayOfWeek,
        },
      },
      create: {
        userId,
        locationId: req.body.locationId,
        dayOfWeek: req.body.dayOfWeek,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        isAvailable: req.body.isAvailable !== false,
      },
      update: {
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        isAvailable: req.body.isAvailable !== false,
      },
      include: { user: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
    });
    res.json(slot);
  }
);
