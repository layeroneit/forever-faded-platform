# Forever Faded — Barbershop Platform

Full-stack booking and management platform for **Forever Faded** (ESTD 2008 · For The Culture). Simple UI, complete backend, multi-location, RBAC, Stripe-ready, and API-first for future iOS/Android apps.

## Features

- **Client:** Book appointments (location → service → barber → date/time), view appointments, profile & preferred barber
- **Barber:** Dashboard, schedule, today’s appointments, profile
- **Manager:** Same as barber + inventory
- **Owner / Admin:** Dashboard, analytics, staff, services, locations, inventory, payroll, settings
- **Backend:** Auth (JWT), RBAC (client, barber, manager, owner, admin), multi-location, appointments, Stripe payment intents (prepaid) and pay-at-shop
- **Mobile-ready:** REST API; same backend can power native iOS/Android apps later

## Tech Stack

- **Backend:** Node.js, Express, Prisma (SQLite dev → PostgreSQL prod), JWT, Stripe
- **Frontend:** React, Vite, React Router, simple CSS (black / gold / white brand)
- **DB:** SQLite for development; set `DATABASE_URL` for PostgreSQL in production

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Install dependencies

```bash
cd forever-faded-platform
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Backend: database and env

```bash
cd server
cp .env.example .env
# Edit .env if needed (JWT_SECRET, STRIPE_* for payments)
npx prisma generate
npx prisma db push
npx prisma db seed
```

**Seed accounts (password: `password123`):**

- Owner: `owner@foreverfaded.com`
- Barber: `mike@foreverfaded.com`, `chris@foreverfaded.com`
- Client: `john@example.com`

### 3. Run API and frontend

**Terminal 1 — API:**

```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**

```bash
cd client
npm run dev
```

- API: http://localhost:3001  
- Web app: http://localhost:3000  

### 4. Logo

Place your Forever Faded logo at **`client/public/logo.png`** so it appears in the header and login. Use the black/gold design from your brand assets.

## Project Structure

```
forever-faded-platform/
├── server/                 # Node API
│   ├── prisma/
│   │   ├── schema.prisma   # DB schema (RBAC, locations, appointments, payroll, inventory)
│   │   └── seed.js
│   └── src/
│       ├── index.js
│       ├── middleware/     # auth, RBAC
│       ├── routes/         # auth, locations, services, appointments, payments, schedule, inventory, payroll, admin, users
│       └── lib/
├── client/                 # React app
│   ├── public/
│   │   └── logo.png        # Add your logo here
│   └── src/
│       ├── components/
│       ├── context/        # Auth
│       ├── lib/            # API client
│       └── pages/
└── README.md
```

## API Overview (mobile-ready)

- `POST /api/auth/login` — Login (email, password)
- `POST /api/auth/register` — Client registration
- `GET /api/locations` — List locations
- `GET /api/services?locationId=` — Services by location
- `GET /api/users?locationId=&role=barber` — Barbers for booking
- `POST /api/appointments` — Create appointment
- `GET /api/appointments?from=&to=` — List appointments
- `PATCH /api/appointments/:id` — Update status / payment
- `POST /api/payments/create-payment-intent` — Stripe prepaid
- `GET /api/payments/config` — Publishable key for Stripe.js
- Plus: schedule, inventory, payroll, admin stats/users (see `server/src/routes/`)

All protected routes use header: `Authorization: Bearer <token>`.

## Stripe

1. Create a Stripe account and get API keys.
2. In `server/.env` set:
   - `STRIPE_SECRET_KEY=sk_...`
   - `STRIPE_PUBLISHABLE_KEY=pk_...`
3. Prepaid bookings use Payment Intents; pay-at-shop is recorded via `POST /api/payments/confirm-paid-at-shop`.

## License

Proprietary — Forever Faded.
