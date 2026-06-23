# Release Defect Register

| ID | Priority | Finding | Root cause | Status / evidence |
| --- | --- | --- | --- | --- |
| REL-001 | P1 | Monthly cron could be publicly callable in production without `CRON_SECRET`. | Endpoint allowed missing secret. | Fixed. Shared cron authorization helper and unit tests added. |
| REL-002 | P1 | Login admitted only one hard-coded email and did not consistently reject inactive/unregistered directory users. | Login policy differed from role model. | Fixed. Login, server user resolution, and callback now require an active `User` record. |
| REL-003 | P1 | Post-auth callback accepted unsafe redirect targets and did not validate application access. | No local-path validation / directory check. | Fixed with `safePostAuthPath` and callback account check. |
| REL-004 | P2 | Shared action drawers lacked dialog semantics, Escape close, and focus return. | `<details>` implementation. | Fixed and covered by Playwright. |
| REL-005 | P2 | Persisted dark theme could flash back to light during hydration. | Client effect cleared root class before reading storage. | Fixed and covered by Playwright. |
| REL-006 | P2 | Critical Axe violations: unnamed table pagination buttons and filter selects. | Icon-only buttons and labels lacked accessible names. | Fixed; Axe seed-mode gate passes. |
| REL-007 | P2 | Loan page overflowed at 768px with sidebar/table/header. | Desktop layout breakpoint activated too early. | Fixed: table and page-header breakpoint now uses `lg`; Firefox responsive test passes. |
| REL-008 | P1 | Allocation engine accepts/returns GHS amounts as binary floating-point numbers. | `capital-allocation.ts` uses `number` for money and rounds with `Math.round`. | Open, release blocking. Decimal-safe refactor required. |
| REL-009 | P1 | Destructive reset and relational-write certification cannot run safely. | No isolated test database is available; Docker is absent. | Open, release blocking. Test compose/guard added; provision test DB then run scenario. |
| REL-010 | P2 | Existing action handlers can return raw database error messages to users. | Multiple catch blocks return `err.message`. | Open. Central action-error sanitization required. |
| REL-011 | P2 | Several investor package/rate parameters are hard-coded. | `investor-packages.ts` and fund parameter defaults. | Open pending confirmed policy/configuration migration. |
