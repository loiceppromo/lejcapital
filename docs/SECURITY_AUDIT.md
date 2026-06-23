# Security Audit

## Verified

- Supabase identity is checked server-side; application access now requires an active `User` directory record.
- Role checks protect routes, server actions, and exports. Investor export scoping has Playwright evidence.
- Cron endpoints now fail closed in production without `CRON_SECRET`.
- Redirect targets after auth are restricted to local application paths.
- Production headers include frame denial, nosniff, referrer policy, permissions policy, API no-store, and CSP.
- `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities on 2026-06-23.
- No tracked secrets were found by the release scan; environment values were never printed.

## Remaining launch gates

- Run authenticated live-role tests against a staging Supabase project, including inactive user, unknown user, investor isolation, password reset, session expiry and callback flows.
- Review Supabase RLS policies against the deployed project; repository policy SQL alone is insufficient evidence.
- Replace raw `err.message` returns in server actions with a centralized user-safe error mapper.
