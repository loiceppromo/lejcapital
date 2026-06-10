# LEJ Capital Management System — Project Status

Last updated: 2026-06-10

## Completed Phases

- Phase 1 foundation is present: Prisma schema, `/src/lib/finance` calculation engine, and finance unit tests.
- Professional app shell and routed platform pages are present: sidebar, top bar, brand components, dashboard, cycles, ledger, market, loans, engines, investors, reports, audit, risk, and settings.
- LEJ brand assets/components are present under the app UI layer and are used by the shell.
- Supabase/Prisma scaffolding is present: Prisma PostgreSQL schema, migrations, Prisma 7 `pg` adapter setup, Supabase browser/server clients, middleware/proxy, login page, and auth callback route.
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
- Database persistence is conditional on `DATABASE_URL` being configured. When it is not configured, the app falls back to seed data.
- No database URL, password, API key, or Supabase secret was printed or recorded here.
- Next database step is to verify the target Supabase project and apply Prisma migrations safely.

## Supabase/Auth Status

- Supabase client/server helpers and middleware are present.
- Login and auth callback routes are present.
- The app supports seed mode when Supabase public config is missing.
- Admin-only enforcement for `loiceppromo@gmail.com` still needs to be verified and completed before real private use.
- Secrets must remain in environment files or the deployment environment only.

## Stabilization Results

- `npm run lint` passes.
- `npm run test` passes.
- `npm run build` passes.
- Stabilization changes were limited to lint/build correctness:
  - Removed a route-change state update effect from the app shell and closed the mobile drawer from mobile nav link clicks instead.
  - Removed render-time angle mutation from the sleeve donut chart.
  - Removed one unused import from the data query layer.
- No UI/UX ZIP work has been started.
- No finance formulas, Prisma schema, migrations, or financial assumptions were changed.

## Known Issues

- No Git remote is configured in this local checkout, so the project cannot yet be pushed to GitHub from this workspace without a repository URL or GitHub repo creation step.
- `src/components/charts/` is currently untracked in git and should be intentionally added or reviewed before commit.
- Supabase migrations need to be applied/verified against the intended Supabase Postgres database.
- Admin-only access for `loiceppromo@gmail.com` needs explicit enforcement and tests/checks.
- Some server actions and page workflows should be checked for full audit logging before real financial operations.
- UI/UX ZIP has not been inspected yet by instruction; UI refactor should wait until persistence/auth stability is finished.

## Next Recommended Steps

1. Save the stable checkpoint to GitHub: configure or create a remote, add intended files, commit, and push.
2. Verify Supabase environment configuration without exposing secrets.
3. Apply Prisma migrations to Supabase and confirm the app reads/writes persistent data.
4. Enforce admin-only access for `loiceppromo@gmail.com`.
5. Continue the Ledger/Entries module only after persistence/auth are stable.
6. Inspect and apply the uploaded UI/UX skill ZIP only after the above steps are stable.
