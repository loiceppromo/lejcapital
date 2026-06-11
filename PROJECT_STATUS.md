# LEJ Capital Management System — Project Status

Last updated: 2026-06-11

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
- CSV exports neutralize spreadsheet formula-injection prefixes before download.
- Seed-mode report snapshots are present so dashboard KPI sparklines render before real monthly snapshots exist.
- Sidebar navigation now uses proper SVG icons instead of two-letter collapsed labels.
- Platform route loading now uses layout-matched skeleton states instead of a generic spinner.
- Shared data tables now support sortable headers, 10/25/50 row pagination, and row-count footers.
- Playwright E2E smoke coverage is present for seed-mode login, dashboard render, investor settings guard, portfolio CSV export, and keyboard shortcut navigation.
- Playwright E2E smoke coverage also verifies investor export scoping: investor statement PDF is allowed for a linked investor while loan-book export is blocked.
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
- Server action write paths now use generated Prisma client types for audit logs, notifications, settings users, cycles, investors, market holdings, governance, market policy, waterfall, loans, reports, engines, ledger entries, and missing-data resolution.
- The Supabase-backed platform state mapper now reads through the generated Prisma client directly instead of an untyped DB alias.
- Auth mode detection is unit-tested so a configured database cannot silently run as a fund-manager seed session without an explicit local-only override.
- Supabase login attempts are rate-limited per email with unit coverage.
- Board-facing long pages now have sticky section navigation for faster review.
- Shared UI icons now cover navigation, status, theme, sort, form, and empty-state glyphs.
- Route-level loading skeletons are present for all main platform modules, including cycle comparison and loan detail.
- The ledger entry form now uses the shared inline validation field system.
- CI now runs lint/typecheck/unit/build plus Playwright E2E smoke tests.
- A non-destructive `npm run db:smoke` command is available for Supabase/Postgres persistence verification with safe counts only.
- `npm run db:smoke` was run against the configured database and passed: 1 active user, 2 investors, 1 active cycle, 5 sleeves, 3 ledger entries, 2 audit logs, 1 borrower, 1 loan, 3 market holdings, and 2 operating engines. One engine record still has TBC Brand Score inputs, which is expected for validation-stage data.
- README has been replaced with a LEJ-specific setup, validation, database, deployment, and GitHub runbook.
- Initial UI/UX ZIP-guided refactor has been started at the shared layout/component layer: shell, dashboard, KPI cards, section cards, tables, status badges, page headers, and brand tokens.
- CSV export helpers and an export API route are present.
- Loan origination now includes a smart rate recommendation panel with red-team findings and an opportunity-cost comparison against the safer T-Bill alternative.
- Loan detail pages now generate clean agreement drafts plus WhatsApp/email borrower messages for reminders, late notices, partial payments, confirmations, final warnings, and paid-off thank-you messages.
- The dashboard includes a liquidity cliff radar that compares liquid assets, protected principal, projected outflows, and likely cliff timing.
- Reports include an AI audit pack CSV export combining summary metrics, cycles, sleeves, investors, contributions, ledger, market, borrowers, loans, schedules, businesses, stress tests, and audit trail.
- Settings includes a 30-second protected operational reset that preserves users, market assumptions, and audit logs.
- AFH has been removed from seed-mode business records and user-facing business copy; operating businesses are manager-added.

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
- `/engines` manager-added business records and Brand Score allocation surface.
- `/investors` investor list, contributions, repayments, and statements surface.
- `/risk` active-cycle risk dashboard surface.
- `/reports` snapshots, PDF/CSV exports, and governance decision surface.
- `/reports` also captures and displays IC decisions.
- `/audit` audit log and missing-data register surface.
- `/portal` investor-facing portal surface.
- `/settings` system configuration, CSV import, user management, and protected reset surface.
- `/api/export/[report]` dynamic CSV export endpoint.

## Finance Engine Status

- `/src/lib/finance` is intact and was not rewritten during stabilization.
- Tests currently pass: 31 test files, 315 tests.
- Money and rate calculations use `decimal.js`/Prisma Decimal patterns rather than JavaScript floats.
- Implemented finance areas include PCR, NAV, Brand Score, sleeve funding, market policy, amortization, loan portfolio metrics/provisioning, repayment allocation, stress testing, waterfall logic, and loan rate recommendation.
- Unknown values remain represented through nullable/TBC-aware data paths; no new financial defaults were hardcoded during stabilization.

## Prisma/Database Status

- `prisma/schema.prisma` defines the core fund, cycle, sleeve, engine, market, waterfall, borrower, loan, audit/governance, ledger, user/auth, and system config models.
- Migrations are present:
  - `20260609225554_init`
  - `20260609232255_add_ledger_table`
  - `20260610040327_add_notifications_ic_snapshots`
- Database persistence is active when `DATABASE_URL` is configured. When it is not configured, the app falls back to seed data.
- Supabase migration status was previously checked with `npx prisma migrate deploy`; build-time DB reads now show live schema drift for `OperatingEngine.description`, so the next database sync/migration must be applied before live mode is clean.
- Persistence smoke check succeeded with non-sensitive table counts only.
- No database URL, password, API key, or Supabase secret was printed or recorded here.
- Existing real database rows are present for cycles, investors, ledger entries, audit logs, and the admin user table.
- New persisted workflows use existing schema tables where available; no schema migration was required for ledger posting, loan aging, waterfall runs, IC decisions, market policy, rate recommendation display, contract draft generation, borrower messages, audit-pack export, or protected reset.

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
- `npm run test` passes: 31 test files, 315 tests.
- `npx next build` passes.
- `npm run test:e2e` passes after installing the local Playwright Chromium binary.
- `npm run db:smoke` passes against the configured database with safe, non-sensitive counts only.
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
- Latest validation now passes with 31 Vitest files / 315 tests. Latest `npx next build` passes but logs live DB fallback because `OperatingEngine.description` is missing in the connected database.
- Latest hardening removed explicit `any` casts from `src/app/actions` and `src/lib/data/queries.ts`; the remaining `any` text in `src/lib` is ordinary prose/test wording, not untyped production DB access.
- No finance formulas, Prisma schema, migrations, or unconfirmed financial assumptions were changed.
- Browser smoke tests now cover the critical route/export/guard paths in seed mode without requiring Supabase secrets.
- Added smart loan pricing, loan agreement/message generation, AI audit-pack export, liquidity cliff radar, safer reset controls, borrower KYC/risk capture, and guide updates.

## Known Issues

- Local checkpoint commit `49c4c6d` (`Stabilize platform polish batch`) contains the latest validated Claude/Codex continuation work.
- Git remote is configured for `https://github.com/loiceppromo/lejcapital.git`, but local push is blocked by missing GitHub CLI/HTTPS credentials or authorized SSH key. `git push --set-upstream origin main` reaches GitHub but cannot prompt for a username; SSH auth previously returned `Permission denied (publickey)`.
- Supabase Auth password has been configured for `loiceppromo@gmail.com`; login was confirmed by the user.
- Some page workflows should still be manually exercised after accepting the admin invite to verify end-to-end authenticated UX and audit records.
- The UI/UX ZIP was inspected for `ui-styling` and `design-system` guidance. Only its instructions were read; no bundle files were copied into the app.
- Browser smoke verification is active through Playwright and currently passes in seed mode.
- Live database schema drift is present: production build succeeds, but page data collection logs `P2022` for missing `OperatingEngine.description` and falls back to seed data. Apply the current Prisma schema/migration to Supabase before relying on live business records.
- `npm audit --omit=dev` currently reports moderate advisories in Prisma CLI dev tooling and Next's bundled PostCSS. Prisma CLI has been moved to `devDependencies`; the Next/PostCSS audit suggestion is a breaking/inapplicable downgrade path, so no forced audit fix was applied.

## Next Recommended Steps

1. Apply or regenerate the Supabase/Prisma migration needed for the live database to match `prisma/schema.prisma`, especially `OperatingEngine.description`.
2. Push to GitHub once local GitHub credentials or SSH keys are available.
3. Manually verify the smart loan pricing, origination, contract draft, borrower message links, protected reset, and AI audit-pack export against Supabase.
4. Continue hardening persisted invoice/email/WhatsApp send history, voice daily briefs, and remaining policy workflows without changing finance formulas silently.
