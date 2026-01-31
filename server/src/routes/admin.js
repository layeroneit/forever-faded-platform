import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { query } from 'express-validator';
import { prisma } from '../lib/prisma.js';

export const adminRouter = Router();

// GET /api/admin/stats?locationId= — owner/admin. Staff count is always across all locations for owner/admin.
adminRouter.get('/stats', requireRoles('owner', 'admin'), query('locationId').optional(), async (req, res) => {
  const where = {};
  if (req.query.locationId) where.locationId = req.query.locationId;
  else if (req.locationId) where.locationId = req.locationId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  // Staff count is always company-wide for owner/admin (all barbers/managers at all locations)
  const staffWhere = { role: { in: ['barber', 'manager'] }, isActive: true };
  const [totalAppointments, completedToday, totalRevenue, staffCount] = await Promise.all([
    prisma.appointment.count({ where: { ...where, status: 'completed' } }),
    prisma.appointment.count({
      where: { ...where, status: 'completed', startAt: { gte: todayStart, lte: new Date() } },
    }),
    prisma.appointment.aggregate({
      where: { ...where, status: 'completed', paymentStatus: { in: ['paid_at_shop', 'prepaid_online'] } },
      _sum: { totalCents: true },
    }),
    prisma.user.count({ where: staffWhere }),
  ]);
  res.json({
    totalAppointments,
    completedToday,
    totalRevenueCents: totalRevenue._sum.totalCents ?? 0,
    staffCount,
  });
});

// GET /api/admin/users?role=&locationId= — owner/admin; returns all staff (barbers, managers, owners) with metadata
adminRouter.get('/users', requireRoles('owner', 'admin'), query('role').optional(), query('locationId').optional(), async (req, res) => {
  const where = { isActive: true };
  if (req.query.role) where.role = req.query.role;
  if (req.query.locationId) where.locationId = req.query.locationId;
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      locationId: true,
      isActive: true,
      createdAt: true,
      location: { select: { id: true, name: true, address: true, city: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});
