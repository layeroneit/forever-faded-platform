import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { body, param, query } from 'express-validator';
import bcrypt from 'bcryptjs';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

export const usersRouter = Router();

// GET /api/users?locationId=&role= — list barbers for booking (filter by location)
usersRouter.get('/', query('locationId').optional(), query('role').optional(), async (req, res) => {
  const where = { isActive: true };
  if (req.query.locationId) where.locationId = req.query.locationId;
  if (req.query.role) where.role = req.query.role;
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      locationId: true,
      location: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

// GET /api/users/me
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

// PATCH /api/users/me — name, phone (required for clients), preferredBarberId (clients only)
usersRouter.patch(
  '/me',
  body('name').optional().trim(),
  body('phone').optional().trim(),
  body('preferredBarberId').optional(),
  async (req, res) => {
    if (validationError(req, res)) return;
    if (req.role === 'client') {
      if (req.body.name !== undefined && !String(req.body.name).trim()) return res.status(400).json({ error: 'Name is required' });
      if (req.body.phone !== undefined && (req.body.phone == null || !String(req.body.phone).trim())) return res.status(400).json({ error: 'Phone number is required' });
    }
    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.phone !== undefined) data.phone = req.body.phone;
    if (req.role === 'client' && req.body.preferredBarberId !== undefined) data.preferredBarberId = req.body.preferredBarberId || null;
    // Clients must always have name and phone; ensure we never persist empty
    if (req.role === 'client') {
      const current = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, phone: true } });
      const finalName = data.name !== undefined ? String(data.name).trim() : (current?.name ?? '');
      const finalPhone = data.phone !== undefined ? String(data.phone).trim() : (current?.phone ?? '');
      if (!finalName) return res.status(400).json({ error: 'Name is required' });
      if (!finalPhone) return res.status(400).json({ error: 'Phone number is required' });
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, name: true, phone: true, role: true, locationId: true, preferredBarberId: true },
      include: { location: true, preferredBarber: { select: { id: true, name: true } } },
    });
    res.json(user);
  }
);

// PATCH /api/users/:id — owner/admin; update staff profile (name, phone, locationId, role)
usersRouter.patch(
  '/:id',
  requireRoles('owner', 'admin'),
  param('id').notEmpty(),
  body('name').optional().trim(),
  body('phone').optional().trim(),
  body('locationId').optional(),
  body('role').optional().isIn(['client', 'barber', 'manager', 'owner', 'admin']),
  async (req, res) => {
    if (validationError(req, res)) return;
    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.phone !== undefined) data.phone = req.body.phone;
    if (req.body.locationId !== undefined) data.locationId = req.body.locationId || null;
    if (req.body.role !== undefined) data.role = req.body.role;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        locationId: true,
        location: { select: { id: true, name: true } },
      },
    });
    res.json(user);
  }
);

// POST /api/users — owner/admin; create barber/staff
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
    if (validationError(req, res)) return;
    const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        passwordHash,
        name: req.body.name,
        phone: req.body.phone ?? null,
        role: req.body.role,
        locationId: req.body.locationId ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        locationId: true,
        location: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(user);
  }
);
