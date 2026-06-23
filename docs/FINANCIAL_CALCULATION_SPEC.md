# Financial Calculation Specification

Authoritative formulas live in `src/lib/finance`; amounts there use `decimal.js` unless explicitly noted below.

| Metric | Formula / treatment | Tests |
| --- | --- | --- |
| NAV | Protection + reserve + market + operating alpha + net loan value + cash/unallocated opening capital. | `nav.test.ts`, `opening-nav.test.ts` |
| Opening NAV | Prior retained capital + new investor contributions; historical opening values are not summed. | `nav.test.ts`, `opening-nav.test.ts` |
| PCR | Liquid assets before repayment / investor principal due; excludes equities and outstanding loan principal. | `pcr.test.ts` |
| Brand Score | `(ROIC × cash conversion × sell-through × repeat demand) / operational risk`; missing input => TBC. | `brand-score.test.ts` |
| Sleeves | Protection, reserve, operating alpha, market alpha, then labelled loan book; retained capital cannot fund operating alpha. | `sleeves.test.ts` |
| Amortization | Reducing-balance equal-payment schedule or flat interest over term; rounded at schedule line level. | `amortization.test.ts` |
| Loan value / PAR | Outstanding principal less provisioning; PAR>N = overdue principal / total outstanding. | `loan-portfolio.test.ts` |
| Market policy | Regime splits, exposure caps and drawdown triggers. | `market.test.ts` |
| Waterfall | Strict priority claims, no lower line paid before higher line. | `waterfall.test.ts` |
| Stress | Deterministic shock matrix; scenarios are not forecasts. | `stress.test.ts` |
| Loan recommendation | T-Bill opportunity cost + risk, term, PCR, expected loss, concentration, operating spread. | `rate-advisor.test.ts` |

## Certification exception

`src/lib/finance/capital-allocation.ts` is an advisory engine but currently represents GHS inputs and allocation outputs as JavaScript `number`. It is not certified as decimal-safe and blocks launch until converted to Decimal or minor-unit arithmetic.
