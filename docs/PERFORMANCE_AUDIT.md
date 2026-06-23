# Performance Audit

- Production build passes.
- E2E now runs against `next build` + `next start`, not development HMR, to avoid non-production chunk behavior.
- Route smoke has passed in Chromium seed mode; Firefox responsive pass covers 375–1920px core routes after the tablet overflow fix.
- No Lighthouse or production RUM baseline exists yet. Before launch, collect LCP/CLS/INP and database query-volume baselines against a populated staging dataset.
