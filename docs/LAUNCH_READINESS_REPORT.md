# Launch Readiness Report

**Status: NOT APPROVED**

**Branch:** `prelaunch-hardening`  
**Base commit:** `378457a` (working tree contains uncommitted certification fixes)  
**Environment tested:** local deterministic seed-mode application; read-only production health/database migration checks.  

## Evidence collected

- `npx prisma migrate status`: five migrations, schema up to date against configured production database.
- `npm run db:smoke`: database/auth connectivity works; operating data is incomplete (no investors, sleeves, borrowers, loans, or active cycle).
- Baseline: lint (one pre-existing warning), typecheck, unit tests, and production build pass.
- Unit: 36 files / 351 tests passed before added hardening tests.
- Focused security tests: 3 files / 16 tests passed.
- Chromium seed smoke: 11 Playwright tests passed.
- Axe seed-mode gate: passed for login/dashboard/ledger/loans/settings.
- Chromium route smoke: 17 static application pages passed.
- Firefox responsive core routes: passed at 375, 390, 768, 1024, 1280, 1440, and 1920 widths after repair.
- Production `https://lejfund.vercel.app/api/health`: HTTP 200, database connected, auth active, runtime OK at time tested.

## Release blockers

1. **P1 decimal safety:** `capital-allocation.ts` uses JavaScript number arithmetic for GHS recommendation amounts.
2. **P1 destructive certification:** no isolated test database is currently available; Docker is not installed, so reset/transaction/relational scenario tests were not run.
3. **P1 staging:** no deployed staging URL or authenticated staging smoke evidence exists.
4. **P2 error safety:** some server actions return raw exception messages.
5. **P2 financial configuration:** investor package and some parameter defaults need confirmed, persisted policy configuration rather than code constants.

## Defect counts

- P0: 0 open
- P1: 3 open, 2 repaired
- P2: 2 open, 3 repaired
- P3: 0 open

## Required before production launch

1. Convert allocation recommendation money values to Decimal/minor units and add exact-value tests.
2. Provision `TEST_DATABASE_URL`, run migrations and the populated acceptance/reset workflow there.
3. Sanitize all server action error responses; retain detailed errors only in secure logs.
4. Replace unconfirmed hard-coded financial policy values with versioned settings approved by the fund manager.
5. Deploy to staging, run authenticated manager/operator/investor tests, verify RLS, external providers, monitoring, backups, and Vercel cron secret.
6. Rerun `npm run test:release` and record the exact passing commit/deployment URL.
