# Deployment and Rollback Plan

1. Provision a separate staging Supabase/Postgres database and set `TEST_DATABASE_URL`; never point it at production.
2. Back up production through Supabase before any migration.
3. Run `npm run test:release`, then `npm run test:db:migrate` and the populated reset acceptance scenario against staging.
4. Deploy this hardening branch to a Vercel preview/staging URL. Verify `/api/health`, headers, authenticated smoke flows, cron secret, email/WhatsApp provider configuration, and monitoring.
5. Merge/deploy only after all P1 gates are closed. Record deployment ID and commit.
6. Roll back in Vercel to the previous known-good deployment if smoke checks fail. Do not run destructive database rollback automatically; restore only from the verified Supabase backup with a documented migration plan.
