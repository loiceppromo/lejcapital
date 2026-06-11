import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'User Guide | LEJ Capital' };

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl py-8 print:py-0">
      {/* Print-optimized header */}
      <div className="mb-8 border-b-2 border-brand-black pb-6 print:mb-4 print:pb-3">
        <h1 className="text-3xl font-bold tracking-tight text-brand-black">LEJ Capital Management System</h1>
        <p className="mt-1 text-lg text-brand-charcoal">User Guide & Operations Manual</p>
        <p className="mt-2 text-sm text-brand-muted">Version 1.0 &middot; June 2026 &middot; Internal use only</p>
      </div>

      {/* Table of contents */}
      <section className="mb-8 rounded-lg border border-brand-line bg-brand-panel p-5 print:break-after-page">
        <h2 className="mb-3 text-lg font-bold text-brand-black">Table of Contents</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-brand-charcoal">
          <li><a href="#overview" className="text-brand-navy hover:underline">System Overview</a></li>
          <li><a href="#getting-started" className="text-brand-navy hover:underline">Getting Started</a></li>
          <li><a href="#dashboard" className="text-brand-navy hover:underline">Dashboard</a></li>
          <li><a href="#cycles" className="text-brand-navy hover:underline">Cycle Management</a></li>
          <li><a href="#sleeves" className="text-brand-navy hover:underline">Capital Sleeves</a></li>
          <li><a href="#businesses" className="text-brand-navy hover:underline">Operating Businesses</a></li>
          <li><a href="#market" className="text-brand-navy hover:underline">Market Portfolio</a></li>
          <li><a href="#loans" className="text-brand-navy hover:underline">Loan Book</a></li>
          <li><a href="#investors" className="text-brand-navy hover:underline">Investor Management</a></li>
          <li><a href="#risk" className="text-brand-navy hover:underline">Risk Dashboard</a></li>
          <li><a href="#waterfall" className="text-brand-navy hover:underline">Waterfall & Distributions</a></li>
          <li><a href="#reports" className="text-brand-navy hover:underline">Reports & Exports</a></li>
          <li><a href="#settings" className="text-brand-navy hover:underline">Settings & Configuration</a></li>
          <li><a href="#roles" className="text-brand-navy hover:underline">Roles & Permissions</a></li>
          <li><a href="#glossary" className="text-brand-navy hover:underline">Glossary</a></li>
        </ol>
      </section>

      {/* 1. Overview */}
      <GuideSection id="overview" number={1} title="System Overview">
        <p>
          LEJ Capital Management is a private fund management application designed to track capital allocation
          across multiple deployment strategies (sleeves), manage investor contributions and distributions,
          monitor loan book health, and enforce risk controls.
        </p>
        <p>The system operates in quarterly cycles and deploys capital across five sleeves:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Protection Sleeve</strong> &mdash; Investor principal protection reserve</li>
          <li><strong>Reserve Sleeve</strong> &mdash; Configurable cash buffer with a floor constraint</li>
          <li><strong>Operating Alpha</strong> &mdash; Capital deployed to manager-added operating businesses</li>
          <li><strong>Market Alpha</strong> &mdash; GSE equities, T-Bills, and cash holdings</li>
          <li><strong>Loan Book</strong> &mdash; Illiquid lending to approved borrowers</li>
        </ul>
        <p>
          All monetary values are in Ghana Cedis (GHS), displayed to two decimal places. Values that are
          not yet known display as <strong>TBC</strong> (To Be Confirmed).
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">How the money flows</h3>
        <p>
          Every activity starts from investor capital. Contributions increase available capital, cycle sleeve
          sizing divides that capital into Protection, Reserve, Operating Alpha, Market Alpha, and Loan Book,
          then the Ledger records actual cash movements in and out. NAV measures total fund value; PCR measures
          whether liquid assets can repay investors on time. Loans and operating deployments can increase NAV,
          but they are not counted as liquid PCR coverage until cash is actually received.
        </p>
      </GuideSection>

      {/* 2. Getting Started */}
      <GuideSection id="getting-started" number={2} title="Getting Started">
        <h3 className="mt-4 font-semibold text-brand-black">Seed Mode vs Live Mode</h3>
        <p>
          When first installed, the system runs in <strong>Seed Mode</strong> with pre-loaded sample data.
          This lets you explore the interface and understand each module before connecting a database.
        </p>
        <p>To go live, configure the following environment variables:</p>
        <div className="rounded-md bg-slate-50 p-3 font-mono text-xs">
          <p>DATABASE_URL=postgresql://...</p>
          <p>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...</p>
        </div>

        <h3 className="mt-4 font-semibold text-brand-black">Navigation</h3>
        <p>
          The left sidebar contains all major sections. On wider screens, you see icon labels; on narrower screens,
          icons only. Use the mobile hamburger menu on phones. Each page has a sticky <strong>section navigator</strong> (PageNav)
          for quick jumps between content areas.
        </p>

        <h3 className="mt-4 font-semibold text-brand-black">Keyboard Shortcuts</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li><kbd className="rounded border border-brand-line bg-white px-1 text-xs">G</kbd> then <kbd className="rounded border border-brand-line bg-white px-1 text-xs">D</kbd> &mdash; Go to Dashboard</li>
          <li><kbd className="rounded border border-brand-line bg-white px-1 text-xs">G</kbd> then <kbd className="rounded border border-brand-line bg-white px-1 text-xs">L</kbd> &mdash; Go to Loans</li>
          <li><kbd className="rounded border border-brand-line bg-white px-1 text-xs">G</kbd> then <kbd className="rounded border border-brand-line bg-white px-1 text-xs">M</kbd> &mdash; Go to Market</li>
          <li><kbd className="rounded border border-brand-line bg-white px-1 text-xs">G</kbd> then <kbd className="rounded border border-brand-line bg-white px-1 text-xs">E</kbd> &mdash; Go to Businesses</li>
          <li><kbd className="rounded border border-brand-line bg-white px-1 text-xs">G</kbd> then <kbd className="rounded border border-brand-line bg-white px-1 text-xs">S</kbd> &mdash; Go to Settings</li>
        </ul>
      </GuideSection>

      {/* 3. Dashboard */}
      <GuideSection id="dashboard" number={3} title="Dashboard">
        <p>
          The Dashboard provides a real-time overview of the fund&apos;s health. Key Performance Indicators (KPIs) at the top show:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>NAV</strong> &mdash; Net Asset Value of the fund</li>
          <li><strong>PCR</strong> &mdash; Protection Cover Ratio (target: 1.15x&ndash;1.25x)</li>
          <li><strong>Total investors</strong> &mdash; Count of active capital contributors</li>
          <li><strong>Active cycle</strong> &mdash; Current deployment period</li>
        </ul>
        <p>
          Below the KPIs, the dashboard displays sleeve allocation donut charts, sparkline trend charts
          for NAV and PCR history, and a market portfolio composition breakdown.
        </p>
        <p>
          <strong>Investor role:</strong> Investors see a simplified view with fund overview metrics only,
          without operational details like loan aging or engine performance.
        </p>
      </GuideSection>

      {/* 4. Cycles */}
      <GuideSection id="cycles" number={4} title="Cycle Management">
        <p>
          LEJ Capital operates in quarterly cycles. Each cycle progresses through four stages:
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li><strong>PLANNING</strong> &mdash; Set opening NAV, configure target allocations</li>
          <li><strong>ACTIVE</strong> &mdash; Accepting contributions, deploying capital, recording transactions</li>
          <li><strong>CLOSING</strong> &mdash; Running waterfall, calculating distributions, reviewing performance</li>
          <li><strong>CLOSED</strong> &mdash; Cycle archived, retained capital carries forward</li>
        </ol>
        <h3 className="mt-4 font-semibold text-brand-black">Creating a New Cycle</h3>
        <p>
          Use the &ldquo;New cycle&rdquo; action drawer. Provide start and end dates. The opening NAV is computed
          from the prior cycle&apos;s retained capital (or manually if this is cycle 1).
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">Transitioning Cycles</h3>
        <p>
          Transitions follow strict rules: PLANNING &rarr; ACTIVE &rarr; CLOSING &rarr; CLOSED.
          You cannot skip stages or go backward. The transition button shows the available next state.
        </p>
      </GuideSection>

      {/* 5. Sleeves */}
      <GuideSection id="sleeves" number={5} title="Capital Sleeves">
        <p>The &ldquo;Size sleeves&rdquo; action on the Cycles page allocates capital across the five sleeves:</p>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-brand-line">
              <th className="py-2 pr-3 text-left font-semibold">Sleeve</th>
              <th className="py-2 pr-3 text-left font-semibold">Funding rule</th>
              <th className="py-2 text-left font-semibold">Priority</th>
            </tr>
          </thead>
          <tbody className="text-brand-charcoal">
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">Protection</td><td className="py-1.5 pr-3">Total investor principal due</td><td className="py-1.5">1 (first)</td></tr>
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">Reserve</td><td className="py-1.5 pr-3">Configurable floor amount</td><td className="py-1.5">2</td></tr>
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">Operating Alpha</td><td className="py-1.5 pr-3">Investor contributions only</td><td className="py-1.5">3</td></tr>
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">Market Alpha</td><td className="py-1.5 pr-3">Remaining liquid capital</td><td className="py-1.5">4</td></tr>
            <tr><td className="py-1.5 pr-3">Loan Book</td><td className="py-1.5 pr-3">Deployed loan principal</td><td className="py-1.5">5</td></tr>
          </tbody>
        </table>
        <p className="mt-3">
          Protection is always funded first to ensure investor capital coverage. If total capital is insufficient,
          lower-priority sleeves receive warnings.
        </p>
      </GuideSection>

      {/* 6. Businesses */}
      <GuideSection id="businesses" number={6} title="Operating Businesses">
        <p>
          Operating businesses (engines) are the entities LEJ Capital deploys Operating Alpha capital into.
          No business is permanently hardcoded into the platform. Add each business manually, then record
          cycle inputs for that business as data becomes available.
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">Adding a Business</h3>
        <p>
          Use the &ldquo;Actions&rdquo; drawer on the Businesses page, select the &ldquo;Add business&rdquo; tab.
          Provide a short code (e.g., UNDC), full name, optional description, and optional logo image.
          Logos should be under 500KB and are stored as data URIs.
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">Brand Score</h3>
        <p>
          Each business is scored on five performance metrics (0&ndash;100%):
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>ROIC (Return on Invested Capital)</li>
          <li>Cash Conversion</li>
          <li>Sell-through Rate</li>
          <li>Repeat Demand</li>
          <li>Operational Risk</li>
        </ul>
        <p>
          The Brand Score formula weights these inputs and determines how Operating Alpha is split
          between businesses. Businesses in <strong>Validation</strong> status are capped at 15% of
          Operating Alpha until their IC review clears them.
        </p>
      </GuideSection>

      {/* 7. Market */}
      <GuideSection id="market" number={7} title="Market Portfolio">
        <p>
          The Market Alpha sleeve manages three instrument types on the Ghana Stock Exchange ecosystem:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>GSE Equities</strong> &mdash; Listed Ghanaian equities (min 3 names for diversification)</li>
          <li><strong>Treasury Bills</strong> &mdash; Short-term government paper (91-day, 182-day, 364-day)</li>
          <li><strong>Cash</strong> &mdash; Broker cash and money market positions</li>
        </ul>
        <h3 className="mt-4 font-semibold text-brand-black">Regime System</h3>
        <p>
          The market regime controls GSE exposure ceilings. Three regimes exist:
        </p>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-brand-line">
              <th className="py-2 pr-3 text-left font-semibold">Regime</th>
              <th className="py-2 pr-3 text-left font-semibold">GSE ceiling</th>
              <th className="py-2 text-left font-semibold">Conditions</th>
            </tr>
          </thead>
          <tbody className="text-brand-charcoal">
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">NORMAL</td><td className="py-1.5 pr-3">40% of Market Alpha</td><td className="py-1.5">Default</td></tr>
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">OPPORTUNISTIC</td><td className="py-1.5 pr-3">55% of Market Alpha</td><td className="py-1.5">All trigger conditions met</td></tr>
            <tr><td className="py-1.5 pr-3">DEFENSIVE</td><td className="py-1.5 pr-3">25% of Market Alpha</td><td className="py-1.5">Drawdown exceeds -15%</td></tr>
          </tbody>
        </table>
        <p className="mt-3">
          Drawdown of -15% or more automatically downgrades to DEFENSIVE regardless of the requested regime.
        </p>
      </GuideSection>

      {/* 8. Loans */}
      <GuideSection id="loans" number={8} title="Loan Book">
        <p>
          The loan book manages illiquid lending. Key features:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Borrower KYC</strong> &mdash; Each borrower needs ID verification and risk grading (A&ndash;E)</li>
          <li><strong>Loan origination</strong> &mdash; Supports flat and reducing-balance interest methods</li>
          <li><strong>Amortization schedules</strong> &mdash; Auto-generated monthly payment plans</li>
          <li><strong>Repayment allocation</strong> &mdash; Configurable order: Fees &rarr; Interest &rarr; Principal</li>
          <li><strong>Aging & provisioning</strong> &mdash; BoG 7-band provisioning model</li>
          <li><strong>Smart pricing</strong> &mdash; Recommended rate compares borrower risk, PCR pressure, PAR, and T-Bill opportunity cost</li>
          <li><strong>Contracts & messages</strong> &mdash; Agreement drafts plus WhatsApp/email borrower reminders and receipts</li>
        </ul>
        <h3 className="mt-4 font-semibold text-brand-black">Smart Loan Pricing</h3>
        <p>
          The loan origination drawer can recommend an annual interest rate. It starts with the safer T-Bill
          alternative, adds credit and term risk premiums, accounts for PAR/default pressure, and checks whether
          the loan beats the opportunity cost after expected loss. The recommendation is a decision support tool:
          the Fund Manager still approves the final rate and should keep the IC rationale.
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">Red-Team Decision Mode</h3>
        <p>
          Red-team findings are objections the system raises before approval, such as weak PCR, poor spread over
          T-Bills, high borrower grade risk, or loan-book concentration. Treat these as a challenge checklist
          before cash leaves the fund.
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">Provisioning Bands</h3>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-brand-line">
              <th className="py-2 pr-3 text-left font-semibold">Days past due</th>
              <th className="py-2 text-left font-semibold">Provision rate</th>
            </tr>
          </thead>
          <tbody className="text-brand-charcoal">
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">Current (0 days)</td><td className="py-1.5">1%</td></tr>
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">1&ndash;30 days</td><td className="py-1.5">1%</td></tr>
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">31&ndash;60 days</td><td className="py-1.5">10%</td></tr>
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">61&ndash;90 days</td><td className="py-1.5">10%</td></tr>
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">91&ndash;180 days</td><td className="py-1.5">25%</td></tr>
            <tr className="border-b border-brand-line"><td className="py-1.5 pr-3">181&ndash;360 days</td><td className="py-1.5">50%</td></tr>
            <tr><td className="py-1.5 pr-3">360+ days</td><td className="py-1.5">100%</td></tr>
          </tbody>
        </table>
        <p className="mt-3">
          Loans become <strong>DEFAULTED</strong> at 90 days past due. PAR (Portfolio at Risk) ratios
          at 30-day and 90-day thresholds are monitored on the risk dashboard.
        </p>
      </GuideSection>

      {/* 9. Investors */}
      <GuideSection id="investors" number={9} title="Investor Management">
        <p>
          The Investors page manages capital contributors to the fund.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Add investors</strong> &mdash; Name, contact, and optional link to a user account</li>
          <li><strong>Record contributions</strong> &mdash; Cash inflows tied to specific cycles</li>
          <li><strong>Record repayments</strong> &mdash; Distributions back to investors (principal + returns)</li>
          <li><strong>Statements</strong> &mdash; Per-investor contribution/repayment history, downloadable as PDF</li>
        </ul>
        <p>
          The total investor principal due drives the Protection Sleeve target and the PCR denominator.
        </p>
      </GuideSection>

      {/* 10. Risk */}
      <GuideSection id="risk" number={10} title="Risk Dashboard">
        <p>
          The risk dashboard consolidates all risk metrics into a single view:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>PCR monitoring</strong> &mdash; Green (&ge;1.15x), Watch (&lt;1.15x), Breach (&lt;1.00x)</li>
          <li><strong>Loan risk</strong> &mdash; PAR ratios, default rate, watch/defaulted loan counts</li>
          <li><strong>Market risk</strong> &mdash; GSE exposure, drawdown, regime status</li>
          <li><strong>Business risk</strong> &mdash; Operating business metrics such as defect rate, refund rate, delays, sales-vs-target, and sell-through</li>
          <li><strong>Stress scenarios</strong> &mdash; Simulates NAV under market shocks and loan default spikes</li>
        </ul>
        <p>
          Status badges use a traffic-light system: <span className="font-semibold text-[#1f5d42]">GREEN</span>,{' '}
          <span className="font-semibold text-[#80611a]">WATCH</span>,{' '}
          <span className="font-semibold text-[#9b2f28]">BREACH</span>.
        </p>
      </GuideSection>

      {/* 11. Waterfall */}
      <GuideSection id="waterfall" number={11} title="Waterfall & Distributions">
        <p>
          When a cycle moves to CLOSING, the waterfall engine distributes available cash in strict priority order:
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Operating expenses</li>
          <li>Loan loss provisions top-up</li>
          <li>Investor principal return</li>
          <li>Reserve floor restoration</li>
          <li>Investor preferred return</li>
          <li>Performance fee (fund manager)</li>
          <li>Carried interest</li>
          <li>Residual to retained capital</li>
        </ol>
        <p>
          If cash is insufficient, higher-priority claims are fully paid before any lower-priority claim
          receives funds. Partial payments are recorded when cash runs out mid-tier.
        </p>
      </GuideSection>

      {/* 12. Reports */}
      <GuideSection id="reports" number={12} title="Reports & Exports">
        <p>Available reports and export formats:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Dashboard snapshot</strong> &mdash; Point-in-time fund health capture (CSV)</li>
          <li><strong>Investor statement</strong> &mdash; Per-investor contribution/repayment history (PDF)</li>
          <li><strong>Loan book export</strong> &mdash; Full loan portfolio with aging (CSV)</li>
          <li><strong>Market holdings</strong> &mdash; Instrument-level position export (CSV)</li>
          <li><strong>NAV history</strong> &mdash; Historical NAV/PCR snapshots for trend analysis</li>
          <li><strong>AI audit pack</strong> &mdash; Complete CSV bundle for external audit or AI-assisted review</li>
        </ul>
        <p>
          Use the browser&apos;s Print function (Ctrl+P / Cmd+P) on any page to generate a clean PDF.
          Presentation mode (toggle in page header) hides interactive elements for cleaner print output.
        </p>
      </GuideSection>

      {/* 13. Settings */}
      <GuideSection id="settings" number={13} title="Settings & Configuration">
        <p>The Settings page (Fund Manager only) includes:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>System status</strong> &mdash; Database and auth connection health</li>
          <li><strong>Brand system</strong> &mdash; LEJ logo assets and color palette reference</li>
          <li><strong>Financial parameters</strong> &mdash; Locked-in PCR bands, provisioning rates, regime rules</li>
          <li><strong>User management</strong> &mdash; Create accounts, assign roles, toggle active status</li>
          <li><strong>CSV import</strong> &mdash; Bulk data upload for loans, investors, market holdings</li>
          <li><strong>System reset</strong> &mdash; 30-second protected reset for operational records, preserving users and audit logs</li>
        </ul>
        <h3 className="mt-4 font-semibold text-brand-black">Voice Assistant Roadmap</h3>
        <p>
          Daily spoken briefs can be added with browser speech synthesis at no API cost. Verbal commands need
          browser speech recognition where supported. A ChatGPT/OpenAI assistant would require an API key and
          usage billing, so it should be added only after the core financial workflow is stable.
        </p>
      </GuideSection>

      {/* 14. Roles */}
      <GuideSection id="roles" number={14} title="Roles & Permissions">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-brand-line">
              <th className="py-2 pr-3 text-left font-semibold">Role</th>
              <th className="py-2 pr-3 text-left font-semibold">Access</th>
              <th className="py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-brand-charcoal">
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3 font-medium">Fund Manager</td>
              <td className="py-2 pr-3">All pages</td>
              <td className="py-2">Full create/update/delete. Settings access. User management.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3 font-medium">Operator</td>
              <td className="py-2 pr-3">All pages except Settings</td>
              <td className="py-2">Record repayments, update engine inputs, resolve missing data, add ledger entries.</td>
            </tr>
            <tr>
              <td className="py-2 pr-3 font-medium">Investor</td>
              <td className="py-2 pr-3">Dashboard, Portal, Reports</td>
              <td className="py-2">Read-only. View own statements and fund overview.</td>
            </tr>
          </tbody>
        </table>
      </GuideSection>

      {/* 15. Glossary */}
      <GuideSection id="glossary" number={15} title="Glossary">
        <dl className="space-y-3 text-sm">
          <GlossaryItem term="NAV" definition="Net Asset Value. Total fund assets minus liabilities." />
          <GlossaryItem term="PCR" definition="Protection Cover Ratio. Liquid assets before repayment divided by investor principal due. Target: 1.15x-1.25x." />
          <GlossaryItem term="Liquidity cliff" definition="The estimated point where liquid capital may no longer cover protected principal and expected cycle outflows." />
          <GlossaryItem term="Opportunity cost" definition="The return LEJ gives up by choosing a loan instead of a safer alternative such as a Treasury Bill." />
          <GlossaryItem term="Red-team review" definition="A pre-approval challenge that looks for reasons a loan, market buy, or deployment may be weak before capital is committed." />
          <GlossaryItem term="PAR" definition="Portfolio at Risk. Percentage of outstanding loan book with payments past a given threshold (30 or 90 days)." />
          <GlossaryItem term="TBC" definition="To Be Confirmed. Sentinel value for data not yet available." />
          <GlossaryItem term="Brand Score" definition="Weighted composite score of five operating business performance metrics." />
          <GlossaryItem term="Regime" definition="Market deployment stance: NORMAL (default), OPPORTUNISTIC (higher GSE ceiling), DEFENSIVE (lower ceiling, triggered by drawdown)." />
          <GlossaryItem term="Drawdown" definition="Peak-to-trough decline in market portfolio value within a cycle." />
          <GlossaryItem term="Validation gate" definition="Cap on a business's Operating Alpha share until IC review confirms sufficient data." />
          <GlossaryItem term="Waterfall" definition="Priority-ordered distribution of available cash at cycle close." />
          <GlossaryItem term="Sleeve" definition="Named capital allocation bucket within the fund structure." />
          <GlossaryItem term="KYC" definition="Know Your Customer. Borrower identity verification process." />
          <GlossaryItem term="IC" definition="Investment Committee. Decision-making body for capital deployment." />
          <GlossaryItem term="BoG" definition="Bank of Ghana. Regulatory authority whose NPL provisioning norms are applied." />
          <GlossaryItem term="GHS" definition="Ghana Cedi. The fund's base currency." />
          <GlossaryItem term="GSE" definition="Ghana Stock Exchange. The securities market where equities are listed." />
        </dl>
      </GuideSection>

      {/* Footer */}
      <div className="mt-10 border-t-2 border-brand-black pt-4 text-center text-xs text-brand-muted print:mt-6">
        <p className="font-semibold text-brand-black">LEJ Capital Management System</p>
        <p>This document is confidential and intended for internal use only.</p>
        <p className="mt-1">To print as PDF: File &rarr; Print &rarr; Save as PDF</p>
      </div>
    </div>
  );
}

function GuideSection({ id, number, title, children }: { id: string; number: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-24 print:break-inside-avoid">
      <h2 className="mb-3 border-b border-brand-line pb-2 text-xl font-bold text-brand-black">
        {number}. {title}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-brand-charcoal">
        {children}
      </div>
    </section>
  );
}

function GlossaryItem({ term, definition }: { term: string; definition: string }) {
  return (
    <div>
      <dt className="font-semibold text-brand-black">{term}</dt>
      <dd className="ml-4 text-brand-charcoal">{definition}</dd>
    </div>
  );
}
