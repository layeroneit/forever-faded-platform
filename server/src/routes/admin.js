import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';

export const adminRouter = Router();

// GET /api/admin/stats - dashboard stats (owner/admin)
adminRouter.get('/stats', requireRoles('owner', 'admin'), query('locationId').optional(), async (req, res) => {
  const where = {};
  if (req.query.locationId) where.locationId = req.query.locationId;
  else if (req.locationId) where.locationId = req.locationId;
  const [totalAppointments, completedToday, totalRevenue, staffCount] = await Promise.all([
    prisma.appointment.count({ where: { ...where, status: 'completed' } }),
    prisma.appointment.count({
      where: {
        ...where,
        status: 'completed',
        startAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date() },
      },
    }),
    prisma.appointment.aggregate({
      where: { ...where, status: 'completed', paymentStatus: { in: ['paid_at_shop', 'prepaid_online'] } },
      _sum: { totalCents: true },
    }),
    prisma.user.count({ where: { role: { in: ['barber', 'manager'] }, locationId: where.locationId || undefined, isActive: true } }),
  ]);
  res.json({
    totalAppointments,
    completedToday,
    totalRevenueCents: totalRevenue._sum.totalCents || 0,
    staffCount,
  });
});

// GET /api/admin/users - list users (owner/admin; filter by role/location)
adminRouter.get('/users', requireRoles('owner', 'admin'), query('role').optional(), query('locationId').optional(), async (req, res) => {
  const where = {};
  if (req.query.role) where.role = req.query.role;
  if (req.query.locationId) where.locationId = req.query.locationId;
  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, role: true, locationId: true, isActive: true, createdAt: true },
    include: { location: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});
