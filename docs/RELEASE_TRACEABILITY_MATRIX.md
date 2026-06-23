# Release Traceability Matrix

Status as of 2026-06-23 on `prelaunch-hardening`. Inventory source: `tests/release/application-inventory.json`.

| Feature | Route / component | Backend / data | Role | Automated evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Authentication and route guard | `/login`, proxy, `guardPage` | Supabase + `User` | all | role/export Playwright smoke; auth unit tests | Partial: live login/session expiry needs staging evidence |
| Dashboard / NAV / PCR | `/dashboard` | selectors + finance | manager/operator/investor | finance tests; route/a11y tests | Pass in seed mode; live-data parity pending |
| Cycle / sleeves / waterfall | `/cycles` | actions + Cycle/Sleeve/Waterfall | manager | finance lifecycle/sleeve/waterfall tests | Partial: persisted create/close needs isolated DB |
| Ledger capture | `/ledger` | LedgerEntry + audit | manager/operator | fund ledger unit tests; route test | Partial: duplicate/concurrency needs isolated DB |
| Market and trades | `/market` | holdings/trades/policy | manager | market finance tests; route test | Partial: persisted trade workflow needs isolated DB |
| Loan pricing / schedules | `/loans` | Loan/Schedule/Repayment | manager/operator | amortization, portfolio, rate-advisor tests | Partial: persisted full workflow needs isolated DB |
| Capital decisions | `/decisions` | AllocationDecision | manager/operator | allocation engine tests | Blocked: GHS amounts use JS numbers in advisory engine |
| Investor isolation | `/portal`, exports | Investor/User | investor | scoped export Playwright test | Partial: live user and RLS verification pending |
| Audit / reset | `/audit`, `/settings` | AuditLog + transactional reset | manager | reset-plan unit test | Blocked: destructive reset needs isolated DB |
| Accessibility / responsive UI | shared UI | n/a | all | Axe, route, drawer, theme tests | Seed-mode critical pages pass; cross-browser run pending completion |

Every row marked Partial or Blocked remains a release gate; no claim of full completion is implied.
