# Accessibility Audit

- Automated Axe checks pass with no critical/serious violations on seed-mode `/login`, `/dashboard`, `/ledger`, `/loans`, and `/settings` (colour-contrast excluded pending visual colour-token audit).
- Shared drawers now expose `role="dialog"`, `aria-modal`, Escape closing, initial focus and focus restoration.
- Ledger and audit filter controls have explicit label associations; table pagination controls have accessible names.
- Remaining verification: screen-reader manual pass, 200% zoom, contrast measurement, and authenticated populated workflows in staging.
