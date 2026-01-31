import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, query, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

export const usersRouter = Router();

// GET /api/users - list barbers (for booking); optional locationId
usersRouter.get('/', query('locationId').optional(), query('role').optional(), async (req, res) => {
  const where = { isActive: true };
  if (req.query.locationId) where.locationId = req.query.locationId;
  if (req.query.role) where.role = req.query.role;
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, locationId: true },
    include: { location: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

// GET /api/users/me - current user profile
usersRouter.get('/me', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, phone: true, role: true, locationId: true, preferredBarberId: true },
    include: {
      location: { select: { id: true, name: true, address: true } },
      preferredBarber: { select: { id: true, name: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PATCH /api/users/me - update own profile (name, phone, preferredBarberId for clients)
usersRouter.patch(
  '/me',
  body('name').optional().trim(),
  body('phone').optional().trim(),
  body('preferredBarberId').optional(),
  async (req, res) => {
    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.phone !== undefined) data.phone = req.body.phone;
    if (req.role === 'client' && req.body.preferredBarberId !== undefined) data.preferredBarberId = req.body.preferredBarberId || null;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, name: true, phone: true, role: true, locationId: true, preferredBarberId: true },
      include: { location: true, preferredBarber: { select: { id: true, name: true } } },
    });
    res.json(user);
  }
);

// POST /api/users - create user (owner/admin only)
usersRouter.post(
  '/',
  requireRoles('owner', 'admin'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('phone').optional().trim(),
  body('role').isIn(['client', 'barber', 'manager', 'owner', 'admin']),
  body('locationId').optional(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        passwordHash,
        name: req.body.name,
        phone: req.body.phone,
        role: req.body.role,
        locationId: req.body.locationId || null,
      },
      select: { id: true, email: true, name: true, role: true, locationId: true },
      include: { location: { select: { id: true, name: true } } },
    });
    res.status(201).json(user);
  }
);
