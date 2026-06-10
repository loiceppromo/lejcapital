# LEJ Capital Management System — Project Status

Last updated: 2026-06-10

## Completed Phases

- Phase 1 foundation is present: Prisma schema, `/src/lib/finance` calculation engine, and finance unit tests.
- Professional app shell and routed platform pages are present: sidebar, top bar, brand components, dashboard, cycles, ledger, market, loans, engines, investors, reports, audit, risk, and settings.
- LEJ brand assets/components are present under the app UI layer and are used by the shell.
- Supabase/Prisma scaffolding is present: Prisma PostgreSQL schema, migrations, Prisma 7 `pg` adapter setup, Supabase browser/server clients, middleware/proxy, login page, and auth callback route.
- Supabase migrations have been verified against the configured Supabase Postgres database; there are no pending migrations.
- Admin-only Supabase access is enforced for `loiceppromo@gmail.com` in middleware, login, and server action paths.
- Ledger module scaffolding is present: ledger domain helpers, server action, page/client component, and unit tests.
- CSV export helpers and an export API route are present.

## Current Route/Page Structure

- `/` redirects into the platform flow.
- `/login` handles seed-mode or Supabase login.
- `/auth/callback` handles Supabase auth callback.
- `/dashboard` executive dashboard.
- `/cycles` cycles, sleeve sizing, and waterfall surface.
- `/ledger` entries table and ledger capture surface.
- `/market` holdings, regimes, exposure, and drawdown surface.
- `/loans` loan book, borrowers, origination, repayment, PAR/default surface.
- `/engines` UNDC/AFH records and Brand Score allocation surface.
- `/investors` investor list, contributions, repayments, and statements surface.
- `/risk` active-cycle risk dashboard surface.
- `/reports` snapshots and export surface.
- `/audit` audit log and missing-data register surface.
- `/settings` system configuration surface.
- `/api/export/[report]` dynamic CSV export endpoint.

## Finance Engine Status

- `/src/lib/finance` is intact and was not rewritten during stabilization.
- Tests currently pass: 13 test files, 130 tests.
- Money and rate calculations use `decimal.js`/Prisma Decimal patterns rather than JavaScript floats.
- Implemented finance areas include PCR, NAV, Brand Score, sleeve funding, market policy, amortization, loan portfolio metrics/provisioning, repayment allocation, stress testing, and waterfall logic.
- Unknown values remain represented through nullable/TBC-aware data paths; no new financial defaults were hardcoded during stabilization.

## Prisma/Database Status

- `prisma/schema.prisma` defines the core fund, cycle, sleeve, engine, market, waterfall, borrower, loan, audit/governance, ledger, user/auth, and system config models.
- Migrations are present:
  - `20260609225554_init`
  - `20260609232255_add_ledger_table`
- Database persistence is active when `DATABASE_URL` is configured. When it is not configured, the app falls back to seed data.
- Supabase migration status was checked with `npx prisma migrate deploy`; both existing migrations are applied and no pending migrations remain.
- Persistence smoke check succeeded with non-sensitive table counts only.
- No database URL, password, API key, or Supabase secret was printed or recorded here.
- Existing real database rows are present for cycles, investors, ledger entries, audit logs, and the admin user table.

## Supabase/Auth Status

- Supabase client/server helpers and middleware are present.
- Login and auth callback routes are present.
- The app supports seed mode when Supabase public config is missing.
- Admin-only enforcement for `loiceppromo@gmail.com` is implemented.
- Supabase Auth invite for `loiceppromo@gmail.com` was sent, and the app `User` row was synced for audit actor tracking.
- `scripts/seed-users.mjs` no longer hardcodes or prints a password; it requires `LEJ_ADMIN_PASSWORD` if password-based seeding is used later.
- Secrets must remain in environment files or the deployment environment only.

## Stabilization Results

- `npm run lint` passes.
- `npm run test` passes.
- `npm run build` passes.
- Stabilization changes include lint/build correctness plus Supabase/admin persistence hardening:
  - Removed a route-change state update effect from the app shell and closed the mobile drawer from mobile nav link clicks instead.
  - Removed render-time angle mutation from the sleeve donut chart.
  - Removed one unused import from the data query layer.
  - Added admin auth policy/server helpers.
  - Replaced state-changing action money/rate `parseFloat` usage with Decimal-backed form parsing.
  - Attached authenticated admin actors to audit log writes when Supabase auth is enabled.
- No UI/UX ZIP work has been started.
- No finance formulas, Prisma schema, migrations, or financial assumptions were changed.

## Known Issues

- Git remote is configured for `https://github.com/loiceppromo/lejcapital.git`, but local push is blocked by missing GitHub CLI/HTTPS credentials or authorized SSH key.
- Supabase Auth invite must be accepted from `loiceppromo@gmail.com` before password/session login can be fully exercised.
- Some page workflows should still be manually exercised against Supabase to verify end-to-end UX and audit records.
- UI/UX ZIP has not been inspected yet by instruction; UI refactor should wait until persistence/auth stability is finished.

## Next Recommended Steps

1. Accept the Supabase Auth invite for `loiceppromo@gmail.com`.
2. Manually verify login/logout and one low-risk write workflow against Supabase.
3. Continue the Ledger/Entries module end-to-end against persistent data.
4. Inspect and apply the uploaded UI/UX skill ZIP after persistence/auth workflow verification.
5. Push to GitHub once local GitHub credentials or SSH keys are available.
