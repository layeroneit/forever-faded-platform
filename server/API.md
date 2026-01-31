# Forever Faded API

Base URL: `http://localhost:3001/api` (or your `PORT`).

All responses use `{ error: "message" }` on 4xx/5xx. Validation errors return a single `error` string.

Auth: Send `Authorization: Bearer <token>` for protected routes. Token from `POST /auth/login` or `/auth/register`.

---

## Public (no auth)

| Method | Path | Body | Description |
|--------|------|------|--------------|
| GET | /health | — | Health check |
| POST | /auth/login | email, password | Returns `{ token, user }` |
| POST | /auth/register | email, password, name, phone? | Client signup; returns `{ token, user }` |

---

## Protected (JWT required)

### Locations
| Method | Path | Body / Query | Who | Description |
|--------|------|--------------|-----|--------------|
| GET | /locations | — | All | List: owner/admin see all; others active only or own location |
| GET | /locations/:id | — | All | One location |
| POST | /locations | name, address, city, state?, zip?, phone?, timezone? | owner, admin | Create |
| PATCH | /locations/:id | name?, address?, city?, state?, zip?, phone?, timezone?, isActive? | owner, admin | Update (allowed fields only) |

### Services
| Method | Path | Body / Query | Who | Description |
|--------|------|--------------|-----|--------------|
| GET | /services | locationId?, all=1 | All | List; all=1 shows inactive (owner/admin/manager) |
| GET | /services/:id | — | All | One service |
| POST | /services | locationId, name, category?, description?, durationMinutes, priceCents, isActive? | owner, admin, manager | Create |
| PATCH | /services/:id | name?, category?, description?, durationMinutes?, priceCents?, isActive?, locationId? | owner, admin, manager | Update (allowed fields only) |

### Appointments
| Method | Path | Body / Query | Who | Description |
|--------|------|--------------|-----|--------------|
| GET | /appointments | locationId?, from?, to? | All | List (filtered by role) |
| GET | /appointments/:id | — | All | One (client/barber own only) |
| POST | /appointments | locationId, barberId, serviceId, startAt (ISO), clientId?, notes? | All | Create (clientId defaults to self for clients) |
| PATCH | /appointments/:id | status?, paymentStatus?, notes? | barber, manager, owner, admin | Update status/notes |

### Users
| Method | Path | Body / Query | Who | Description |
|--------|------|--------------|-----|--------------|
| GET | /users | locationId?, role? | All | List (barbers for booking) |
| GET | /users/me | — | All | Current user profile |
| PATCH | /users/me | name?, phone?, preferredBarberId? (clients) | All | Update profile |
| POST | /users | email, password, name, phone?, role, locationId? | owner, admin | Create staff |

### Payments
| Method | Path | Body | Who | Description |
|--------|------|------|-----|--------------|
| GET | /payments/config | — | All | Publishable key (Stripe optional) |
| POST | /payments/create-payment-intent | appointmentId, amountCents? | Client | Prepaid; returns clientSecret |
| POST | /payments/confirm-paid-at-shop | appointmentId | barber, manager, owner, admin | Mark paid at shop |

### Schedule
| Method | Path | Body / Query | Who | Description |
|--------|------|--------------|-----|--------------|
| GET | /schedule | userId?, locationId? | All | List slots (barber sees own) |
| POST | /schedule | locationId, dayOfWeek (0–6), startTime (HH:mm), endTime, userId?, isAvailable? | barber, manager, owner, admin | Upsert slot |

### Inventory
| Method | Path | Body / Query | Who | Description |
|--------|------|--------------|-----|--------------|
| GET | /inventory | locationId? | All | List items |
| POST | /inventory | locationId, name, sku?, quantity, reorderPoint?, unit? | owner, admin, manager | Create |
| PATCH | /inventory/:id | quantity?, change?, reason? | owner, admin, manager | Update qty (logs change) |

### Payroll
| Method | Path | Body / Query | Who | Description |
|--------|------|--------------|-----|--------------|
| GET | /payroll | locationId?, userId? | barber (own), owner/admin (all) | List entries |
| POST | /payroll | userId, locationId, periodStart, periodEnd, commissionRatePercent, grossCents, commissionCents | owner, admin | Create |
| PATCH | /payroll/:id | paidAt? (ISO or omit for now) | owner, admin | Mark paid |

### Admin
| Method | Path | Query | Who | Description |
|--------|------|-------|-----|--------------|
| GET | /admin/stats | locationId? | owner, admin | totalAppointments, completedToday, totalRevenueCents, staffCount |
| GET | /admin/users | role?, locationId? | owner, admin | List users |

---

## Dev setup

1. Copy `.env.example` to `.env`.
2. `DATABASE_URL="file:./dev.sqlite"` for SQLite (no install).
3. Stripe keys optional; omit for dev (payments return 503 if not set).
4. `npm install` then `npx prisma generate` and `npx prisma db push` and `npx prisma db seed`.
5. `npm run dev` to start server.
