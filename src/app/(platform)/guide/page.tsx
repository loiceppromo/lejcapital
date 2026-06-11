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
          <li><a href="#calculator" className="text-brand-navy hover:underline">Loan Calculator & Rate Engine</a></li>
          <li><a href="#contracts" className="text-brand-navy hover:underline">Loan Contracts & Invoices</a></li>
          <li><a href="#whatsapp" className="text-brand-navy hover:underline">WhatsApp Borrower Communications</a></li>
          <li><a href="#audit-export" className="text-brand-navy hover:underline">Audit Data Export</a></li>
          <li><a href="#roles" className="text-brand-navy hover:underline">Roles & Permissions</a></li>
          <li><a href="#voice-assistant" className="text-brand-navy hover:underline">Voice Assistant</a></li>
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
        <h3 className="mt-4 font-semibold text-brand-black">Real-Time Market Data</h3>
        <p>
          The market page includes a live data section that auto-refreshes every 60 seconds. It shows:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>GSE Indices</strong> &mdash; GSE-CI and GSE-FSI composite values with change and YTD return</li>
          <li><strong>T-Bill Rates</strong> &mdash; 91-day, 182-day, 364-day yields from the latest BoG auction</li>
          <li><strong>Stock Table</strong> &mdash; Individual GSE equities with price, change%, volume, sector, market cap, and mini sparkline trend charts</li>
          <li><strong>FX Rates</strong> &mdash; USD, EUR, GBP exchange rates against GHS</li>
        </ul>
        <p>
          The scrolling market ticker at the top of every page shows a compact view of this data. Hover to pause scrolling.
          In production, replace the seed data functions with live API calls to GSE and Bank of Ghana feeds.
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">Multi-Currency Display</h3>
        <p>
          Click the currency toggle button in the header bar to cycle between <strong>GHS</strong>, <strong>USD</strong>,
          <strong>EUR</strong>, and <strong>GBP</strong>. All major monetary KPIs (NAV, liquid assets, loan outstanding,
          investor principal, liquidity buffer) auto-convert to the selected currency using seed exchange rates.
          The base currency is always GHS &mdash; other currencies are for display reference only.
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
        <h3 className="mt-4 font-semibold text-brand-black">Voice Assistant</h3>
        <p>
          A voice assistant button appears in the bottom-right corner of every page (Fund Manager and Operator only).
          It uses the free browser Speech API &mdash; no external service or API key required. See
          the <a href="#voice-assistant" className="text-brand-navy underline">Voice Assistant section</a> for full details.
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

      {/* 15. Loan Calculator & Rate Engine */}
      <GuideSection id="calculator" number={15} title="Loan Calculator & Rate Engine">
        <p>
          The Loan Calculator (accessible from the sidebar) is a what-if tool for modelling loan
          terms before origination. It includes a <strong>Smart Rate Engine</strong> that automatically
          recommends an interest rate based on the fund&apos;s current state.
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">How the recommended rate is calculated</h3>
        <p>The rate is built from seven components that stack together:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li><strong>T-Bill benchmark</strong> &mdash; The 91-day Treasury Bill rate. This is the risk-free return the fund gives up by lending instead of buying T-Bills. It&apos;s the floor — you should never lend below this.</li>
          <li><strong>Credit risk premium</strong> &mdash; Added based on the borrower&apos;s risk grade (A through E). Grade A borrowers get 0% extra, while Grade E gets +13%.</li>
          <li><strong>Term premium</strong> &mdash; Longer loans lock up capital and increase uncertainty. 1-3 months: +0%, 4-6 months: +1%, 7-12 months: +2.5%, 13-24 months: +4%, 25+ months: +6%.</li>
          <li><strong>PCR health adjustment</strong> &mdash; If the fund&apos;s Protection Cover Ratio is under pressure (below 1.15x), the rate goes up because every GHS lent needs to work harder to rebuild coverage. If PCR is strong (above 1.25x), the rate is slightly reduced to stay competitive.</li>
          <li><strong>Expected loss loading</strong> &mdash; Based on the current portfolio&apos;s PAR (Portfolio at Risk) rates and default history. Higher portfolio stress = higher rate needed to cover losses.</li>
          <li><strong>Concentration risk</strong> &mdash; If the loan is large relative to NAV or the existing loan book, an additional premium is added. This discourages over-concentration in any single borrower.</li>
          <li><strong>Operating spread</strong> &mdash; A fixed 2.5% margin to cover fund administration, documentation, collections, and governance costs.</li>
        </ol>
        <h3 className="mt-4 font-semibold text-brand-black">Opportunity cost comparison</h3>
        <p>
          For every loan, the calculator compares: <em>&ldquo;Would we earn more by buying T-Bills instead?&rdquo;</em>
          It calculates the T-Bill return for the same amount and term, subtracts expected losses from the loan,
          and shows whether the loan beats the safer alternative. If it doesn&apos;t, the system flags it.
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">Red team assessment</h3>
        <p>
          Before any loan is approved, the system automatically &ldquo;attacks&rdquo; the decision by checking:
          Is PCR under pressure? Is the loan too large relative to NAV? Is the borrower high-risk?
          Does the T-Bill alternative actually win? Each finding comes with a severity level (LOW, WATCH, BREACH)
          and a specific action to mitigate the risk.
        </p>
      </GuideSection>

      {/* 16. Loan Contracts & Invoices */}
      <GuideSection id="contracts" number={16} title="Loan Contracts & Invoices">
        <p>
          The <strong>Loan Contract Builder</strong> (found in the Loans page under the &ldquo;Contracts&rdquo; tab)
          generates professional, printable loan agreements. Each contract includes:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Borrower name, contact, address, and identification details</li>
          <li>Loan terms: principal, interest rate, method, term, monthly payment, total repayment</li>
          <li>Full amortization schedule with each instalment amount</li>
          <li>Collateral description and estimated value</li>
          <li>Late payment policy (2% per 7-day overdue period)</li>
          <li>General conditions and borrower declaration</li>
          <li>Signature blocks for both parties</li>
          <li>Proof of identity attachment section</li>
          <li>Purpose of loan</li>
        </ul>
        <h3 className="mt-4 font-semibold text-brand-black">How to generate a contract</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Go to Loans &rarr; Contracts tab</li>
          <li>Select the loan from the dropdown</li>
          <li>Fill in the borrower&apos;s address and purpose of loan</li>
          <li>Preview the contract in the right panel</li>
          <li>Click &ldquo;Preview &amp; print&rdquo; to open in a new window — use Ctrl+P to print or save as PDF</li>
        </ol>
        <h3 className="mt-4 font-semibold text-brand-black">Payment invoices</h3>
        <p>
          The system can generate instalment invoices for each payment period. These are professional
          email-ready HTML documents showing the exact amount due, due date, and outstanding balance.
        </p>
      </GuideSection>

      {/* 17. WhatsApp Communications */}
      <GuideSection id="whatsapp" number={17} title="WhatsApp Borrower Communications">
        <p>
          The <strong>WhatsApp panel</strong> (Loans page &rarr; &ldquo;WhatsApp&rdquo; tab) generates professional,
          pre-written messages for every stage of the loan lifecycle. Messages are branded with LEJ Capital
          and written in a professional but friendly tone.
        </p>
        <h3 className="mt-4 font-semibold text-brand-black">Available message types</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Disbursement confirmation</strong> &mdash; Sent when the loan is disbursed, includes all loan details</li>
          <li><strong>Friendly reminder</strong> &mdash; Sent 3-5 days before a payment is due</li>
          <li><strong>Due date reminder</strong> &mdash; Sent on the day payment is due</li>
          <li><strong>Late payment notice</strong> &mdash; Sent when a payment is 1-30 days overdue</li>
          <li><strong>Partial payment received</strong> &mdash; Acknowledges a partial payment and states the remaining balance</li>
          <li><strong>Payment confirmation</strong> &mdash; Confirms receipt of a full instalment</li>
          <li><strong>Overdue escalation</strong> &mdash; Sent at 31-60 days past due</li>
          <li><strong>Final warning</strong> &mdash; Last notice before formal collection (60+ days)</li>
          <li><strong>Full repayment thanks</strong> &mdash; Congratulatory message when the loan is fully repaid</li>
        </ul>
        <h3 className="mt-4 font-semibold text-brand-black">How to use</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Select the borrower&apos;s loan</li>
          <li>Choose the message type</li>
          <li>Select the relevant payment period</li>
          <li>Preview the message in the WhatsApp-style panel on the right</li>
          <li>Click &ldquo;Send via WhatsApp&rdquo; to open WhatsApp Web with the message pre-filled, or &ldquo;Copy&rdquo; to paste manually</li>
        </ol>
      </GuideSection>

      {/* 18. Audit Data Export */}
      <GuideSection id="audit-export" number={18} title="Audit Data Export">
        <p>
          After each cycle closes, you should run an audit. The <strong>Audit page</strong> provides
          download buttons for every type of data in the system:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Full audit pack</strong> &mdash; One CSV containing everything: executive summary, cycles, sleeves, investors, contributions, ledger, market holdings, borrowers, loans, loan schedule, businesses, audit trail, and stress test results</li>
          <li><strong>Ledger entries</strong> &mdash; All cash in/out movements</li>
          <li><strong>Loan book</strong> &mdash; All loans with principal, rate, status, aging</li>
          <li><strong>Audit trail</strong> &mdash; Every action performed in the system</li>
          <li>Individual exports for: portfolio, investors, contributions, borrowers, businesses, cycles, loan schedule, and dashboard snapshots</li>
        </ul>
        <h3 className="mt-4 font-semibold text-brand-black">AI-powered auditing workflow</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Close the cycle using the cycle transition flow</li>
          <li>Go to Audit &rarr; scroll to &ldquo;Audit data export&rdquo;</li>
          <li>Download the Full audit pack</li>
          <li>Upload to your AI assistant (ChatGPT, Claude, etc.) and ask it to review all transactions, verify provisioning, check cash flow integrity, and flag anomalies</li>
          <li>The AI can cross-reference contributions against ledger entries, verify loan disbursements match schedules, and ensure provisions follow the BoG 7-band rules</li>
        </ol>
      </GuideSection>

      {/* 19. Roles */}
      <GuideSection id="roles" number={19} title="Roles & Permissions">
        <p>Three role tiers control what each user can see and do:</p>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-brand-line">
              <th className="py-2 pr-3 text-left font-semibold">Role</th>
              <th className="py-2 pr-3 text-left font-semibold">Pages</th>
              <th className="py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-brand-charcoal">
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3 font-medium">Fund Manager</td>
              <td className="py-2 pr-3">All 14 pages + Settings</td>
              <td className="py-2">Full create/update/delete. System reset. User management. Contract generation. WhatsApp. Audit export.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3 font-medium">Operator</td>
              <td className="py-2 pr-3">All pages except Settings</td>
              <td className="py-2">Record repayments, update engine inputs, resolve missing data, add ledger entries, use calculator.</td>
            </tr>
            <tr>
              <td className="py-2 pr-3 font-medium">Investor</td>
              <td className="py-2 pr-3">Dashboard, Portal, Reports, Guide</td>
              <td className="py-2">Read-only. View own statements and fund overview. Download own contribution records.</td>
            </tr>
          </tbody>
        </table>
      </GuideSection>

      {/* 20. Voice Assistant */}
      <GuideSection id="voice-assistant" number={20} title="Voice Assistant">
        <p>
          The voice assistant is a floating microphone button in the bottom-right corner of every page.
          It is available to <strong>Fund Manager</strong> and <strong>Operator</strong> roles only (Investors do not see it).
          It uses the <strong>Web Speech API</strong> built into Chrome, Edge, and Safari &mdash; completely free with no external API key.
        </p>

        <h3 className="mt-4 font-semibold text-brand-black">How to use</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Click the microphone button (bottom-right) to open the assistant panel.</li>
          <li>Tap the mic icon and speak a command, or type your question in the text input.</li>
          <li>The assistant will process your request and read the answer aloud.</li>
          <li>Use the quick-action chips (Daily brief, PCR, Loans, Liquidity) for one-tap access.</li>
          <li>Click the stop (square) button to interrupt speech at any time.</li>
        </ol>

        <h3 className="mt-4 font-semibold text-brand-black">Available commands</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-brand-line">
              <th className="py-2 pr-3 text-left font-semibold">Say this</th>
              <th className="py-2 text-left font-semibold">What you get</th>
            </tr>
          </thead>
          <tbody className="text-brand-charcoal">
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;Daily brief&quot; / &quot;Summary&quot; / &quot;How are we doing&quot;</td>
              <td className="py-2">Full fund status: cycle, NAV, PCR, risk breaches, loan book, liquidity, investor count, top actions.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;What&apos;s the NAV&quot; / &quot;Net asset value&quot;</td>
              <td className="py-2">Current NAV with breakdown by protection, loan book, and market.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;PCR status&quot; / &quot;Protection coverage&quot;</td>
              <td className="py-2">PCR ratio, band (Green/Watch/Breach), liquid assets vs. principal due.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;Loans&quot; / &quot;Loan book&quot;</td>
              <td className="py-2">Active/defaulted loan count, total outstanding, provisions, PAR&gt;30, default rate.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;Investors&quot; / &quot;Contributions&quot;</td>
              <td className="py-2">Investor count, total principal due, current cycle info.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;Risk&quot; / &quot;Breaches&quot;</td>
              <td className="py-2">Active risk breach count and top required actions.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;Liquidity&quot; / &quot;Cash&quot; / &quot;Run out&quot;</td>
              <td className="py-2">Liquidity status, buffer, cliff date projection, recommended action.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;Cycle&quot; / &quot;When&quot;</td>
              <td className="py-2">Current cycle number, status, date range, days remaining.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;Market&quot; / &quot;Portfolio&quot; / &quot;T-Bill&quot;</td>
              <td className="py-2">Holding count, GSE exposure vs. limit, current regime.</td>
            </tr>
            <tr className="border-b border-brand-line">
              <td className="py-2 pr-3">&quot;Businesses&quot; / &quot;Engines&quot;</td>
              <td className="py-2">Registered business count, active in current cycle.</td>
            </tr>
            <tr>
              <td className="py-2 pr-3">&quot;Help&quot; / &quot;What can you do&quot;</td>
              <td className="py-2">Lists all available voice commands.</td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-4 font-semibold text-brand-black">Browser compatibility</h3>
        <p>
          Voice recognition works best in <strong>Google Chrome</strong> and <strong>Microsoft Edge</strong>.
          Safari supports text-to-speech but has limited recognition. Firefox does not support speech recognition.
          If your browser doesn&apos;t support voice input, you can still type commands in the text field.
        </p>

        <h3 className="mt-4 font-semibold text-brand-black">Tips</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Start each morning with &quot;Daily brief&quot; for a spoken status of the entire fund.</li>
          <li>Use the quick-action chips when you want a specific metric without speaking.</li>
          <li>The assistant panel stays open while you navigate between pages &mdash; great for monitoring.</li>
          <li>All data comes from the same seed/state used by the dashboard. No separate API calls are needed.</li>
        </ul>
      </GuideSection>

      {/* 21. Glossary */}
      <GuideSection id="glossary" number={21} title="Glossary">
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
          <GlossaryItem term="DPD" definition="Days Past Due. The number of days a loan payment is overdue. Used to determine provisioning bands." />
          <GlossaryItem term="EMI" definition="Equated Monthly Instalment. The fixed monthly payment on a reducing-balance loan." />
          <GlossaryItem term="Flat rate" definition="Interest method where interest is calculated on the original principal for the entire term, resulting in equal payments but higher effective cost." />
          <GlossaryItem term="Reducing balance" definition="Interest method where interest is calculated on the outstanding principal each period, reducing as principal is repaid." />
          <GlossaryItem term="Origination fee" definition="A one-time fee charged when a loan is disbursed. Can be deducted from disbursement or added to the loan balance." />
          <GlossaryItem term="NPL" definition="Non-Performing Loan. A loan that is in default or close to default (typically 90+ days overdue)." />
          <GlossaryItem term="T-Bill" definition="Treasury Bill. Short-term government securities issued by the Bank of Ghana. Used as the risk-free benchmark." />
          <GlossaryItem term="ROIC" definition="Return on Invested Capital. Measures how efficiently a business generates returns on the capital invested in it." />
          <GlossaryItem term="Risk grade" definition="A-E rating assigned to borrowers. A = lowest risk (prime), E = highest risk. Affects the recommended loan interest rate." />
          <GlossaryItem term="Concentration risk" definition="The risk of having too much capital deployed to a single borrower or instrument relative to NAV." />
          <GlossaryItem term="Operating spread" definition="The fixed margin (2.5%) added to all loan rates to cover fund management and operational costs." />
          <GlossaryItem term="FX Rate" definition="Foreign exchange rate — the price of one currency in terms of another. Used in multi-currency display mode." />
          <GlossaryItem term="Sparkline" definition="A tiny inline chart showing recent price movement or trend data within a table cell or KPI card." />
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
