# Running Forever Faded in Dev Mode with Docker

## Quick start

1. **Create `server/.env`** so Compose can load it (e.g. `cp server/.env.example server/.env`). Stripe/SMTP can stay empty.
2. From the project root:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Then open **http://localhost:3000**. The Vite dev server proxies `/api` to the API container.

## What runs

| Service | Port | Description |
|---------|------|-------------|
| **web** | 3000 | Vite dev server (React, HMR). Use this URL in the browser. |
| **api** | 3001 | Node/Express API (node --watch). SQLite DB in a volume. |

- **Hot reload:** Your `server/` and `client/` folders are mounted, so edits on the host trigger API restart and Vite HMR.
- **Database:** SQLite lives in the `ff_dev_db` volume so it persists between restarts. Schema is applied on first start via `prisma db push`.

## Optional: Stripe / SMTP

Create `server/.env` from `server/.env.example` and add your keys. The compose file loads `server/.env` if present; `DATABASE_URL` and `PORT` are overridden so the DB stays in the volume and the API stays on 3001.

## Commands

```bash
# Build and start (detached)
docker compose -f docker-compose.dev.yml up -d --build

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop
docker compose -f docker-compose.dev.yml down

# Reset DB (delete volume)
docker compose -f docker-compose.dev.yml down -v
```

## Seed the DB (optional)

```bash
docker compose -f docker-compose.dev.yml exec api npx prisma db seed
```
