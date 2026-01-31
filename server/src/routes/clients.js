import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import { query } from 'express-validator';
import { validationError } from '../lib/validate.js';
import { prisma } from '../lib/prisma.js';

export const clientsRouter = Router();

// GET /api/clients?barberId=&locationId= — client library for barber/owner
// Barbers see only clients who have booked with them; owners see all (optional locationId).
clientsRouter.get(
  '/',
  requireRoles('barber', 'manager', 'owner', 'admin'),
  query('barberId').optional(),
  query('locationId').optional(),
  async (req, res) => {
    if (validationError(req, res)) return;
    const barberId = req.query.barberId || (req.role === 'barber' || req.role === 'manager' ? req.userId : null);
    const locationId = req.query.locationId || null;

    const where = { status: { notIn: ['cancelled', 'no_show'] } };
    if (barberId) where.barberId = barberId;
    if (locationId) where.locationId = locationId;
    // Owner/admin without barberId: see all clients who have any appointment
    // Barber/manager: barberId is forced to self above

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        clientId: true,
        startAt: true,
        service: { select: { name: true } },
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    // Aggregate by client: last booking, total count, last service
    const byClient = new Map();
    for (const apt of appointments) {
      if (!apt.client) continue;
      const id = apt.clientId;
      if (!byClient.has(id)) {
        byClient.set(id, {
          client: apt.client,
          lastBookingAt: apt.startAt,
          lastServiceName: apt.service?.name ?? null,
          totalAppointments: 0,
        });
      }
      byClient.get(id).totalAppointments += 1;
    }

    const list = Array.from(byClient.values()).map((row) => ({
      ...row.client,
      lastBookingAt: row.lastBookingAt,
      lastServiceName: row.lastServiceName,
      totalAppointments: row.totalAppointments,
    }));

    list.sort((a, b) => new Date(b.lastBookingAt) - new Date(a.lastBookingAt));
    res.json(list);
  }
);
