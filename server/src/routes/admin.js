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
