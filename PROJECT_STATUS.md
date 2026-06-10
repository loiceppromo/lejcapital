# LEJ Capital Management System — Project Status

Last updated: 2026-06-10

## Completed Phases

- Phase 1 foundation is present: Prisma schema, `/src/lib/finance` calculation engine, and finance unit tests.
- Professional app shell and routed platform pages are present: sidebar, top bar, brand components, dashboard, cycles, ledger, market, loans, engines, investors, reports, audit, risk, and settings.
- LEJ brand assets/components are present under the app UI layer and are used by the shell.
- Supabase/Prisma scaffolding is present: Prisma PostgreSQL schema, migrations, Prisma 7 `pg` adapter setup, Supabase browser/server clients, middleware/proxy, login page, and auth callback route.
- Supabase migrations have been verified against the configured Supabase Postgres database; there are no pending migrations.
- Admin-only Supabase access is enforced for `loiceppromo@gmail.com` in middleware, login, and server action paths.
- Persistent database access is blocked when Supabase Auth is missing, unless `LEJ_ALLOW_DB_SEED_MODE=1` is explicitly set in non-production local development.
- Ledger module scaffolding is present: ledger domain helpers, server action, page/client component, and unit tests.
- Ledger entries now read from Supabase through the persistence-aware state loader when the database is configured.
- Ledger entry creation waits for successful persistence before updating the UI and writes an audit log entry.
- Financial write workflows now post corresponding ledger entries for investor contributions/repayments, market deployments, loan disbursements, loan repayments, and waterfall distributions.
- Loan origination persists amortization schedules; loan repayments persist allocations and update schedule status.
- Loan aging/provision refresh persists days-past-due, schedule status, default/paid-off state, and BoG-aligned provision amounts.
- Cycle waterfall runs are persisted with strict priority lines, paid amounts, cash-after values, ledger postings, and audit records.
- IC decisions are captured as auditable governance records with position, decision, and rationale.
- Market regime policy is persisted per cycle with opportunistic trigger evidence and audit logging.
- Missing-data register items can be resolved with value/source capture for supported borrower and engine fields.
- Dashboard snapshots can be captured as frozen monthly records and exported through CSV/PDF dashboard-snapshot outputs.
- IC decisions and dashboard snapshots now use the dedicated `ICDecision` and `ReportSnapshot` tables, with legacy reads kept for older rows.
- Role-based access control is present across pages and action drawers.
- Notifications, user management surfaces, keyboard shortcuts, print/presentation polish, CSV import UI, Docker/Vercel deployment files, cycle comparison, loan detail, and investor portal routes are present from the Claude continuation work.
- CSV imports for loans, contributions, and market holdings now produce core side effects: schedules and ledger entries where applicable.
- CSV parsing now has dedicated unit coverage and supports quoted commas, escaped quotes, quoted newlines, malformed-row reporting, and required-column validation.
- Seed-mode report snapshots are present so dashboard KPI sparklines render before real monthly snapshots exist.
- Sidebar navigation now uses proper SVG icons instead of two-letter collapsed labels.
- Platform route loading now uses layout-matched skeleton states instead of a generic spinner.
- Shared data tables now support sortable headers, 10/25/50 row pagination, and row-count footers.
- Playwright E2E smoke coverage is present for seed-mode login, dashboard render, investor settings guard, portfolio CSV export, and keyboard shortcut navigation.
- Toast notifications are present for major platform actions, including loans, repayments, borrowers, ledger entries, investor actions, cycles, engines, market holdings/policy, waterfalls, reports, IC decisions, missing-data resolution, and CSV import.
- Breadcrumb navigation is present across all platform page headers, including deep pages such as loan detail and cycle comparison.
- Sidebar navigation shows attention dots for risk breaches, blocking missing data, defaulted/PAR loans, and related watch states.
- Shared empty states are present for empty tables and key no-data views such as loan repayment history and investor portal records.
- Subtle reduced-motion-safe page fade transitions are applied to the main platform content.
- A compact/comfortable density toggle is available in the top bar and persists locally.
- A shared icon component is present and has started replacing ad-hoc shell/action SVGs.
- Supabase Realtime refresh scaffolding is present at the app shell level for key financial/governance tables and only activates when Supabase/database configuration is active.
- Realtime refresh coverage now includes the full set of dashboard-impacting fund, investor, loan, market, governance, audit, notification, and configuration tables.
- Audit log actor syncing preserves the authenticated user's actual role instead of elevating all writers to `FUND_MANAGER`.
- Auth mode detection is unit-tested so a configured database cannot silently run as a fund-manager seed session without an explicit local-only override.
- Board-facing long pages now have sticky section navigation for faster review.
- Shared UI icons now cover navigation, status, theme, sort, form, and empty-state glyphs.
- Route-level loading skeletons are present for all main platform modules, including cycle comparison and loan detail.
- The ledger entry form now uses the shared inline validation field system.
- CI now runs lint/typecheck/unit/build plus Playwright E2E smoke tests.
- A non-destructive `npm run db:smoke` command is available for Supabase/Postgres persistence verification with safe counts only.
- README has been replaced with a LEJ-specific setup, validation, database, deployment, and GitHub runbook.
- Initial UI/UX ZIP-guided refactor has been started at the shared layout/component layer: shell, dashboard, KPI cards, section cards, tables, status badges, page headers, and brand tokens.
- CSV export helpers and an export API route are present.

## Current Route/Page Structure

- `/` redirects into the platform flow.
- `/login` handles seed-mode or Supabase login.
- `/auth/callback` handles Supabase auth callback.
- `/dashboard` executive dashboard.
- `/cycles` cycles, sleeve sizing, and waterfall surface.
- `/cycles/compare` cycle-by-cycle comparison surface.
- `/ledger` entries table and ledger capture surface.
- `/market` holdings, regimes, exposure, and drawdown surface.
- `/loans` loan book, borrowers, origination, repayment, PAR/default surface.
- `/loans/[id]` individual loan detail surface.
- `/engines` UNDC/AFH records and Brand Score allocation surface.
- `/investors` investor list, contributions, repayments, and statements surface.
- `/risk` active-cycle risk dashboard surface.
- `/reports` snapshots, PDF/CSV exports, and governance decision surface.
- `/reports` also captures and displays IC decisions.
- `/audit` audit log and missing-data register surface.
- `/portal` investor-facing portal surface.
- `/settings` system configuration surface.
- `/api/export/[report]` dynamic CSV export endpoint.

## Finance Engine Status

- `/src/lib/finance` is intact and was not rewritten during stabilization.
- Tests currently pass: 21 test files, 204 tests.
- Money and rate calculations use `decimal.js`/Prisma Decimal patterns rather than JavaScript floats.
- Implemented finance areas include PCR, NAV, Brand Score, sleeve funding, market policy, amortization, loan portfolio metrics/provisioning, repayment allocation, stress testing, and waterfall logic.
- Unknown values remain represented through nullable/TBC-aware data paths; no new financial defaults were hardcoded during stabilization.

## Prisma/Database Status

- `prisma/schema.prisma` defines the core fund, cycle, sleeve, engine, market, waterfall, borrower, loan, audit/governance, ledger, user/auth, and system config models.
- Migrations are present:
  - `20260609225554_init`
  - `20260609232255_add_ledger_table`
  - `20260610040327_add_notifications_ic_snapshots`
- Database persistence is active when `DATABASE_URL` is configured. When it is not configured, the app falls back to seed data.
- Supabase migration status was checked with `npx prisma migrate deploy`; both existing migrations are applied and no pending migrations remain.
- Persistence smoke check succeeded with non-sensitive table counts only.
- No database URL, password, API key, or Supabase secret was printed or recorded here.
- Existing real database rows are present for cycles, investors, ledger entries, audit logs, and the admin user table.
- New persisted workflows use existing schema tables where available; no schema migration was required for ledger posting, loan aging, waterfall runs, IC decisions, or market policy.

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
- `npm run test` passes: 21 test files, 204 tests.
- `npm run build` passes.
- `npm run test:e2e` passes after installing the local Playwright Chromium binary.
- GitHub Actions CI is configured to run Playwright E2E smoke tests in seed mode.
- Latest validation after the Claude/Codex stabilization batch: `npm run lint`, `npm run test`, `npm run build`, and `npm run test:e2e` all pass.
- Stabilization changes include lint/build correctness plus Supabase/admin persistence hardening:
  - Removed a route-change state update effect from the app shell and closed the mobile drawer from mobile nav link clicks instead.
  - Removed render-time angle mutation from the sleeve donut chart.
  - Removed one unused import from the data query layer.
  - Added admin auth policy/server helpers.
  - Replaced state-changing action money/rate `parseFloat` usage with Decimal-backed form parsing.
  - Attached authenticated admin actors to audit log writes when Supabase auth is enabled.
  - Regenerated Prisma Client after confirming the ledger model is in the active schema.
  - Persisted ledger entries through Supabase-backed state instead of seed-only state.
  - Applied the first institutional UI pass without changing finance logic or Prisma schema.
  - Applied a second UI pass to Cycles and Loans: denser cycle timeline, sleeve context, waterfall controls, loan risk controls, borrower status, amortization status, and cleaner action drawers/forms.
  - Applied a third UI pass to Market and Engines: regime controls, holdings status, market policy alerts, Brand Score allocation, validation gates, and cleaner market/engine forms.
  - Applied a fourth UI pass to Investors, Reports, Audit, and Settings: investor statements, export center, audit browser readability, missing-data register, brand/system status, and cleaner investor forms.
  - Replaced raw ID entry in major action forms with selectors.
  - Added automatic ledger posting for financial actions.
  - Added persisted loan schedule, repayment, aging, default, and provisioning workflows.
  - Added persisted cycle waterfall runs.
  - Added auditable IC decision capture.
  - Added persisted market regime policy and opportunistic gate evidence.
  - Added missing-data resolution with source capture.
  - Added monthly dashboard snapshot capture and PDF export.
  - Stabilized Claude continuation work: fixed cycle/sleeve policy enforcement, CSV import schema drift, NAV chart render mutation, and stale imports.
  - Hardened CSV import side effects for loan schedules and ledger posting.
  - Switched IC decision and report snapshot writes to dedicated Prisma models.
- Latest validation now passes with 21 Vitest files / 204 tests and 5 Playwright E2E smoke tests.
- No finance formulas, Prisma schema, migrations, or unconfirmed financial assumptions were changed.
- Browser smoke tests now cover the critical route/export/guard paths in seed mode without requiring Supabase secrets.

## Known Issues

- Local checkpoint commit `49c4c6d` (`Stabilize platform polish batch`) contains the latest validated Claude/Codex continuation work.
- Git remote is configured for `https://github.com/loiceppromo/lejcapital.git`, but local push is blocked by missing GitHub CLI/HTTPS credentials or authorized SSH key. `git push --set-upstream origin main` reaches GitHub but cannot prompt for a username; SSH auth previously returned `Permission denied (publickey)`.
- Supabase Auth password has been configured for `loiceppromo@gmail.com`; login was confirmed by the user.
- Some page workflows should still be manually exercised after accepting the admin invite to verify end-to-end authenticated UX and audit records.
- The UI/UX ZIP was inspected for `ui-styling` and `design-system` guidance. Only its instructions were read; no bundle files were copied into the app.
- Browser smoke verification is active through Playwright and currently passes in seed mode.

## Next Recommended Steps

1. Push to GitHub once local GitHub credentials or SSH keys are available.
2. Manually verify the persisted contribution, loan, waterfall, IC decision, missing-data, snapshot, market policy, and CSV import flows against Supabase.
3. Continue hardening any remaining policy workflows discovered during manual Supabase verification.
4. Keep expanding professional UI polish on long pages, report outputs, and mobile workflows without changing finance formulas.
