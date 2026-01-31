import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    req.locationId = decoded.locationId || null;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Require one of the given roles. Use after authMiddleware. */
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    if (roles.includes(req.role)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

/** Attach full user to req.user (optional, for RBAC checks). */
export async function attachUser(req, res, next) {
  if (!req.userId) return next();
  try {
    req.user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { location: true },
    });
  } catch {
    // ignore
  }
  next();
}
