import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function userShape(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    locationId: user.locationId ?? null,
    location: user.location ? { id: user.location.id, name: user.location.name } : null,
  };
}

// POST /api/auth/login
authRouter.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    if (validationError(req, res)) return;
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, include: { location: true } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { userId: user.id, role: user.role, locationId: user.locationId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({ token, user: userShape(user) });
  }
);

// POST /api/auth/register — client self-register (name, email, phone required)
authRouter.post(
  '/register',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  async (req, res) => {
    if (validationError(req, res)) return;
    const { email, password, name, phone } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, phone: phone.trim(), role: 'client' },
    });
    const token = jwt.sign(
      { userId: user.id, role: user.role, locationId: null },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.status(201).json({
      token,
      user: { ...userShape(user), location: null },
    });
  }
);
