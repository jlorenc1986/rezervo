# Rezervo

Booking ops MVP for **tours, transfers, and boat trips** in Albania — without OTA commissions.

Flow: shareable WhatsApp link → guest picks service / date / seats → confirmation code + deposit → operator dashboard (confirm, deposit paid, no-show).

## Stack

- **App:** Next.js 16 on [Railway](https://railway.app)
- **DB:** Postgres on [Supabase](https://supabase.com) (Drizzle ORM)
- **Local DB option:** Docker Compose Postgres

## Demo

Seed operator: **Blue Ionian Tours** (Saranda)

| URL | Purpose |
|---|---|
| `/` | Product landing |
| `/book/blue-ionian` | Public booking page (IT / EN / SQ) |
| `/ops` | Operator dashboard |
| `/api/health` | Health check (Railway) |

## Setup

1. Copy env:

```bash
cp .env.example .env.local
```

2. Set `DATABASE_URL` to either:

- **Supabase** Transaction pooler URI (port **6543**), or
- **Local Docker:** `postgresql://rezervo:rezervo@127.0.0.1:54329/rezervo`

```bash
npm install
npm run db:up          # only if using local Docker
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Reset demo rows:

```bash
curl -X POST http://localhost:3000/api/demo/reset
# or
npm run db:seed
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development |
| `npm run test` / `test:ci` | Vitest |
| `npm run lint` / `typecheck` / `build` | Quality gates |
| `npm run ci` | lint + typecheck + tests + build |
| `npm run db:up` / `db:down` | Local Postgres |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:seed` | Seed Blue Ionian demo |
| `npm run db:studio` | Drizzle Studio |

## Railway deploy

1. Create a Railway service from this repo (Nixpacks / Next.js).
2. Set env vars:
   - `DATABASE_URL` — Supabase Transaction pooler URI
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In Supabase Auth → URL configuration, add:
   - Site URL: your Railway domain
   - Redirect: `https://YOUR_DOMAIN/auth/callback`
4. Deploy, then run once against that DB:

```bash
DATABASE_URL='…supabase…' npm run db:migrate
DATABASE_URL='…supabase…' npm run db:seed
```

`railway.toml` healthcheck hits `/api/health`.

## Auth & onboarding

Operators sign up at `/signup`, then complete `/onboarding` (business name, slug, WhatsApp, optional first service).  
`/ops` and `/ops/services` require a Supabase session. Public booking stays open at `/book/[slug]`.

## CI

GitHub Actions on `main`: spins up Postgres, migrates, then lint → typecheck → tests → build.

## MVP scope

Included:
- Per-slot capacity (no overbooking)
- Deposit % per service
- Statuses: pending → confirmed → deposit_paid → completed / no_show / cancelled
- WhatsApp deep links
- Postgres persistence (Supabase / local)

**Still missing for a real operator:** see [OPERATOR-READY.md](./OPERATOR-READY.md).

Next build order: **auth + operator onboarding** (block 2).
