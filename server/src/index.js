import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { locationsRouter } from './routes/locations.js';
import { servicesRouter } from './routes/services.js';
import { appointmentsRouter } from './routes/appointments.js';
import { paymentsRouter } from './routes/payments.js';
import { scheduleRouter } from './routes/schedule.js';
import { inventoryRouter } from './routes/inventory.js';
import { payrollRouter } from './routes/payroll.js';
import { adminRouter } from './routes/admin.js';
import { usersRouter } from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health (no auth)
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'forever-faded-api' }));

// Public
app.use('/api/auth', authRouter);

// Protected API (JWT required)
app.use('/api/locations', authMiddleware, locationsRouter);
app.use('/api/services', authMiddleware, servicesRouter);
app.use('/api/appointments', authMiddleware, appointmentsRouter);
app.use('/api/payments', authMiddleware, paymentsRouter);
app.use('/api/schedule', authMiddleware, scheduleRouter);
app.use('/api/inventory', authMiddleware, inventoryRouter);
app.use('/api/payroll', authMiddleware, payrollRouter);
app.use('/api/admin', authMiddleware, adminRouter);
app.use('/api/users', authMiddleware, usersRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Forever Faded API running at http://localhost:${PORT}`);
});
