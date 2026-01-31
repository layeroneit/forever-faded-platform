import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, query } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';
import { sendMail, isEmailConfigured } from '../lib/email.js';

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

// GET /api/admin/daily-sales — owner/admin; today's paid sales (all locations)
const APPOINTMENT_SALE_INCLUDE = {
  client: { select: { id: true, name: true } },
  barber: { select: { id: true, name: true } },
  service: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
};
adminRouter.get('/daily-sales', requireRoles('owner', 'admin'), async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const sales = await prisma.appointment.findMany({
    where: {
      status: 'completed',
      paymentStatus: { in: ['paid_at_shop', 'prepaid_online'] },
      startAt: { gte: todayStart, lte: todayEnd },
    },
    include: APPOINTMENT_SALE_INCLUDE,
    orderBy: { startAt: 'asc' },
  });
  res.json(sales);
});

// GET /api/admin/analytics?period=day|week|month|year — owner/admin; revenue + top/low earners
adminRouter.get(
  '/analytics',
  requireRoles('owner', 'admin'),
  query('period').optional().isIn(['day', 'week', 'month', 'year']),
  async (req, res) => {
    if (validationError(req, res)) return;
    const period = req.query.period || 'day';
    const now = new Date();
    const from = new Date(now);
    if (period === 'day') {
      from.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      const day = from.getDay();
      const diff = from.getDate() - day + (day === 0 ? -6 : 1);
      from.setDate(diff);
      from.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    } else {
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
    }
    const where = {
      status: 'completed',
      paymentStatus: { in: ['paid_at_shop', 'prepaid_online'] },
      startAt: { gte: from, lte: now },
    };
    const [sales, revenueAgg] = await Promise.all([
      prisma.appointment.findMany({
        where,
        select: { id: true, barberId: true, barber: { select: { name: true } }, totalCents: true, startAt: true },
      }),
      prisma.appointment.aggregate({
        where,
        _sum: { totalCents: true },
        _count: true,
      }),
    ]);
    const byBarber = {};
    for (const s of sales) {
      const id = s.barberId;
      if (!byBarber[id]) byBarber[id] = { barberId: id, barberName: s.barber?.name || 'Unknown', revenueCents: 0 };
      byBarber[id].revenueCents += s.totalCents;
    }
    const earners = Object.values(byBarber).sort((a, b) => b.revenueCents - a.revenueCents);
    const topEarners = earners.slice(0, 10);
    const lowestEarners = earners.slice(-10).reverse();
    res.json({
      period,
      from: from.toISOString(),
      to: now.toISOString(),
      totalRevenueCents: revenueAgg._sum.totalCents ?? 0,
      salesCount: revenueAgg._count,
      topEarners,
      lowestEarners,
    });
  }
);

// POST /api/admin/test-email — owner/admin; send a test email
adminRouter.post(
  '/test-email',
  requireRoles('owner', 'admin'),
  body('to').isEmail().normalizeEmail(),
  async (req, res) => {
    if (validationError(req, res)) return;
    if (!isEmailConfigured()) {
      return res.status(400).json({ error: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env' });
    }
    const result = await sendMail({
      to: req.body.to,
      subject: 'Forever Faded — test email',
      text: [
        'This is a test email from Forever Faded.',
        '',
        'If you received this, SMTP is working.',
        '',
        `Sent at ${new Date().toISOString()}`,
      ].join('\n'),
    });
    if (result.sent) {
      res.json({ ok: true, message: 'Test email sent to ' + req.body.to });
    } else {
      res.status(500).json({ error: result.error || 'Failed to send test email' });
    }
  }
);
