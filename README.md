# LEJ Capital Management System

Private internal platform for LEJ Capital Management: fund cycles, sleeve allocation, market portfolio, operating-engine records, LEJ Loans, investors, reporting, audit, and governance.

The app is built with Next.js App Router, TypeScript, Prisma/PostgreSQL, Supabase Auth, Tailwind, Decimal-backed finance helpers, Vitest, and Playwright.

## Current Status

- Finance engine and Prisma schema are in place.
- Routed institutional dashboard UI is in place.
- Supabase/Auth scaffolding is in place with admin access restricted to `loiceppromo@gmail.com`.
- Ledger, loans, market, cycles, investors, reports, risk, audit, settings, and investor portal routes are present.
- Realtime refresh, toasts, breadcrumbs, loading skeletons, E2E smoke tests, Docker/Vercel config, and CI are present.

See `PROJECT_STATUS.md` for the detailed handoff.

## Local Setup

Install dependencies:

```bash
npm ci
```

Generate Prisma Client:

```bash
npm run db:generate
```

Run in seed mode, without Supabase/database credentials:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy the example file and fill real values only on your machine or in the deployment environment:

```bash
cp .env.example .env.local
```

Important variables:

- `DATABASE_URL`: Prisma runtime database URL.
- `DIRECT_URL`: direct database URL for migrations.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase browser anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service key.
- `LEJ_ADMIN_PASSWORD`: optional dev seed password for admin seeding scripts.

Do not commit real secrets.

## Database

Run migrations against the configured database:

```bash
npm run db:migrate
```

Refresh local seed data in development or staging only:

```bash
npm run db:seed
```

The seed refresh script is destructive and refuses production unless explicitly forced.

## Validation

Run the full local validation stack:

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

Current passing baseline:

- ESLint passes.
- Vitest: 21 files, 204 tests.
- Next production build passes.
- Playwright: 5 E2E smoke tests.

## Deployment

Vercel:

- `vercel.json` runs `npx prisma generate && next build`.
- Set all Supabase and database variables in Vercel project settings.
- Do not put secrets in source files.

Docker:

```bash
docker compose up -d
```

The compose file starts the app plus local Postgres. For production, use Supabase or another managed PostgreSQL database.

## GitHub

The remote is expected to be:

```bash
https://github.com/loiceppromo/lejcapital.git
```

If push fails with `could not read Username`, authenticate GitHub on this machine or switch to an authorized SSH key, then run:

```bash
git push --set-upstream origin main
```

## Financial Engineering Rules

- No JavaScript floats for money logic.
- Unknown financial values stay `TBC`.
- Corrections are new entries, not silent edits.
- Financial state changes must be audit-logged.
- Loan principal is illiquid and excluded from PCR liquid assets.
- Finance formulas live under `src/lib/finance` and must stay unit-tested.
