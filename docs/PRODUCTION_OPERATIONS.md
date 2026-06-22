# LEJ Capital Production Operations

## Required Vercel configuration

Set these server-side environment variables in the Vercel project. Do not add them to Git or expose them in client code.

- `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` for both scheduled endpoints
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` to enable transactional email
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` to enable WhatsApp delivery

The production app remains safe without the email/WhatsApp keys: it creates in-app notifications but does not pretend messages were delivered.

## Daily rhythm

Vercel Cron runs `/api/cron/daily-operations` at 06:15 UTC. It creates deduplicated alerts for principal coverage, pending decisions, idle/maturing capital, cycle close, and delinquent loans. Fund-manager email briefs require Resend.

Borrower reminders are additionally gated by a deliberately explicit consent marker: add `COMMS_OPT_IN` to the borrower notes only after documented consent to email/WhatsApp is collected. This is not a substitute for legal/compliance review.

## Monthly rhythm

Vercel Cron runs `/api/cron/monthly-report` on the first day of each month at 06:00 UTC. It captures a report snapshot and sends the management report when email is configured.

## Release checks

Run before each release:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run db:smoke
```

The health endpoint is `GET /api/health`. It runs a real database query and returns a non-200 response if the database or Supabase configuration is unavailable.

## Backups and recovery

Use Supabase point-in-time recovery and scheduled database backups for the production database. Before an intentional operational reset, use the reviewed reset script that creates a JSON pre-reset backup; never run reset tooling against production without confirming the backup location and recovery path.

Audit logs are append-only evidence. Financial corrections must be posted as new entries, never by editing history.
