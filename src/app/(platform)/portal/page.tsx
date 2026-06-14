import type { Metadata } from 'next';
import { DataTable } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { Icon } from '@/components/app/icon';
import { KpiCard } from '@/components/app/kpi-card';
import { PageNav } from '@/components/app/page-nav';
import { PageHeader } from '@/components/app/page-header';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { getCurrentUser } from '@/lib/auth/server';
import { findInvestorByEmail, scopeToInvestor } from '@/lib/fund/investor-lookup';
import {
  getActiveCycle,
  getInvestorStatements,
  getOverview,
  money,
  ratio,
} from '@/lib/platform/selectors';
import { Decimal } from '@/lib/finance';
import { pcrStatusLabel, cycleStatusLabel } from '@/lib/platform/labels';

export const metadata: Metadata = { title: 'Capital Portal | LEJ Capital' };

export default async function InvestorPortalPage() {
  const [state, user] = await Promise.all([loadPlatformState(), getCurrentUser()]);
  const overview = getOverview(state);
  const activeCycle = getActiveCycle(state);
  const allStatements = getInvestorStatements(state);

  // --- Auth scoping ---
  // INVESTOR role: show only the logged-in investor's data
  // FUND_MANAGER / OPERATOR: show all investors
  const isInvestorRole = user.role === 'INVESTOR';
  const matchedInvestor = isInvestorRole
    ? findInvestorByEmail(state.investors, user.email)
    : null;

  // If investor role but no matching record, show access-denied state
  if (isInvestorRole && !matchedInvestor) {
    return (
      <>
        <PageHeader
          breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Portal' }]}
          title="Capital portal"
          description="Your capital position, contributions, and cycle status."
        />
        <SectionCard title="Account not linked">
          <EmptyState
            title="Account not linked"
            description={`No capital partner record is linked to ${user.email ?? 'your account'}. Please contact the fund manager to link your account.`}
          />
        </SectionCard>
      </>
    );
  }

  // Scope data to matched investor (null = show all for admin/operator)
  const investorId = matchedInvestor?.id ?? null;
  const statements = investorId
    ? allStatements.filter((s) => s.investor.id === investorId)
    : allStatements;
  const contributions = scopeToInvestor(state.contributions, investorId);
  const repayments = scopeToInvestor(state.repayments, investorId);

  const totalContributed = statements.reduce(
    (sum, s) => sum.plus(s.totalContributed),
    new Decimal(0),
  );
  const totalRepaid = statements.reduce(
    (sum, s) => sum.plus(s.totalRepaid),
    new Decimal(0),
  );
  const outstandingPrincipal = totalContributed.minus(totalRepaid);

  const portalTitle = isInvestorRole
    ? `Welcome, ${matchedInvestor!.name}`
    : 'Capital portal';
  const portalDescription = isInvestorRole
    ? 'Read-only view of your capital position, contributions, and cycle status.'
    : `Read-only view of all capital partner positions. ${statements.length} partner(s) in current cycle.`;

  return (
    <>
      <PrintHeader title="Capital Statement" subtitle={`Cycle ${activeCycle.sequenceNo} · ${statements.length} partner(s)`} />
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Portal' }]}
        title={portalTitle}
        description={portalDescription}
        action={
          <div className="flex gap-2">
            <PresentationToggle />
            <a
              href="/api/export/investor-statement-pdf"
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-line bg-white px-3 py-2 text-sm font-semibold text-brand-black hover:bg-brand-panel"
              download
            >
              <Icon name="download" className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        }
      />
      <PageNav items={[
        { id: 'portal-overview', label: 'Overview' },
        { id: 'fund-performance', label: 'Fund performance' },
        { id: 'portal-statements', label: 'Statements' },
      ]} />

      {/* Fund-level KPIs visible to partners */}
      <div id="portal-overview" className="kpi-scroll-row scroll-mt-24 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="PCR"
          value={ratio(overview.pcr.pcr)}
          detail="Principal coverage ratio"
          state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}
        />
        <KpiCard
          label="Active cycle"
          value={`Cycle ${activeCycle.sequenceNo}`}
          detail={activeCycle.status}
        />
        <KpiCard
          label={isInvestorRole ? 'Your contributions' : 'Total contributed'}
          value={money(totalContributed)}
          amount={totalContributed.toNumber()}
          detail={isInvestorRole ? 'Across all cycles' : `${statements.length} partner(s)`}
        />
        <KpiCard
          label={isInvestorRole ? 'Your outstanding' : 'Outstanding principal'}
          value={money(outstandingPrincipal)}
          amount={outstandingPrincipal.toNumber()}
          detail="Contributions minus repayments"
        />
      </div>

      {/* Fund performance — sanitised view without sensitive borrower details */}
      <div id="fund-performance" className="mt-5 scroll-mt-24">
        <SectionCard
          title="Fund performance"
          description="Professional summary of fund health and capital deployment. Specific borrower details are confidential."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Fund status"
              value={pcrStatusLabel(overview.pcr.status)}
              detail="Protection cover health"
              state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}
            />
            <KpiCard
              label="Cycle period"
              value={`${activeCycle.startDate} to ${activeCycle.endDate}`}
              detail={`Cycle ${activeCycle.sequenceNo} · ${cycleStatusLabel(activeCycle.status)}`}
            />
            <KpiCard
              label="Risk breaches"
              value={String(overview.riskBreaches)}
              detail={overview.riskBreaches === 0 ? 'All controls within limits' : 'Active breaches being managed'}
              state={overview.riskBreaches === 0 ? 'GREEN' : 'BREACH'}
            />
            <KpiCard
              label="Total partners"
              value={String(state.investors.length)}
              detail="Active capital contributors"
            />
          </div>

          <div className="mt-4 rounded-md border border-brand-line bg-brand-panel p-4">
            <h3 className="text-sm font-semibold text-brand-black">Capital deployment summary</h3>
            <p className="mt-1 text-xs text-brand-muted">
              Capital is deployed across multiple strategies to maximise returns while protecting principal.
              The fund maintains a Protection Cover Ratio to ensure sufficient liquid assets for capital repayment.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-md bg-white p-3">
                <p className="text-[10px] font-semibold uppercase text-brand-muted">Capital protection</p>
                <p className="mt-1 text-sm font-bold text-brand-black">
                  {overview.pcr.pcr.gte(999) ? 'Maximum' : `${overview.pcr.pcr.toFixed(2)}x coverage`}
                </p>
                <p className="text-[10px] text-brand-muted">Liquid assets vs. principal due</p>
              </div>
              <div className="rounded-md bg-white p-3">
                <p className="text-[10px] font-semibold uppercase text-brand-muted">Deployment status</p>
                <p className="mt-1 text-sm font-bold text-brand-black">{cycleStatusLabel(activeCycle.status)}</p>
                <p className="text-[10px] text-brand-muted">Cycle {activeCycle.sequenceNo}</p>
              </div>
              <div className="rounded-md bg-white p-3">
                <p className="text-[10px] font-semibold uppercase text-brand-muted">Loan performance</p>
                <p className="mt-1 text-sm font-bold text-brand-black">
                  {overview.loanMetrics.par30.lte(0.05) ? 'Healthy' : overview.loanMetrics.par30.lte(0.15) ? 'Under watch' : 'Stressed'}
                </p>
                <p className="text-[10px] text-brand-muted">Based on portfolio-at-risk metrics</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Partner statements */}
      <div id="portal-statements" className="mt-5 scroll-mt-24 space-y-5">
        {statements.map((stmt) => (
          <SectionCard
            key={stmt.investor.id}
            title={isInvestorRole ? 'Your statement' : stmt.investor.name}
            description={isInvestorRole ? undefined : `Contact: ${stmt.investor.contact || 'Not provided'}`}
            action={
              <StatusBadge state={stmt.totalRepaid.gte(stmt.totalContributed) ? 'GREEN' : 'NEUTRAL'}>
                {stmt.totalRepaid.gte(stmt.totalContributed) ? 'Fully repaid' : 'Active'}
              </StatusBadge>
            }
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <KpiCard label="Contributed" value={money(stmt.totalContributed)} />
              <KpiCard label="Repaid" value={money(stmt.totalRepaid)} />
              <KpiCard
                label="Outstanding"
                value={money(stmt.totalContributed.minus(stmt.totalRepaid))}
                state={stmt.totalRepaid.gte(stmt.totalContributed) ? 'GREEN' : undefined}
              />
            </div>

            {/* Contribution history */}
            <h3 className="mb-2 text-sm font-semibold text-brand-charcoal">Contributions</h3>
            <DataTable
              headers={['Date', 'Cycle', 'Amount']}
              maxHeight="max-h-48"
              rows={contributions
                .filter((c) => c.investorId === stmt.investor.id)
                .map((c) => {
                  const cycle = state.cycles.find((cy) => cy.id === c.cycleId);
                  return [
                    c.dateReceived,
                    cycle ? `Cycle ${cycle.sequenceNo}` : c.cycleId,
                    <span key="amt" className="font-mono">{money(c.amount)}</span>,
                  ];
                })}
            />

            {/* Repayment history */}
            {repayments.filter((r) => r.investorId === stmt.investor.id).length > 0 && (
              <>
                <h3 className="mb-2 mt-4 text-sm font-semibold text-brand-charcoal">Repayments</h3>
                <DataTable
                  headers={['Date', 'Cycle', 'Principal due', 'Amount repaid']}
                  maxHeight="max-h-48"
                  rows={repayments
                    .filter((r) => r.investorId === stmt.investor.id)
                    .map((r) => {
                      const cycle = state.cycles.find((cy) => cy.id === r.cycleId);
                      return [
                        r.repaymentDate,
                        cycle ? `Cycle ${cycle.sequenceNo}` : r.cycleId,
                        <span key="due" className="font-mono">{money(r.principalDue)}</span>,
                        <span key="paid" className="font-mono">{money(r.amountRepaid)}</span>,
                      ];
                    })}
                />
              </>
            )}

            {/* Cycle participation */}
            <h3 className="mb-2 mt-4 text-sm font-semibold text-brand-charcoal">Cycles participated</h3>
            <div className="flex flex-wrap gap-2">
              {stmt.cycles.map((entry) => {
                const cycle = state.cycles.find((cy) => cy.id === entry.cycleId);
                return (
                  <span
                    key={entry.cycleId}
                    className="inline-flex rounded-full bg-brand-panel px-3 py-1 text-xs font-medium text-brand-charcoal ring-1 ring-brand-line"
                  >
                    {cycle ? `Cycle ${cycle.sequenceNo} · ${cycle.status}` : entry.cycleId}
                  </span>
                );
              })}
            </div>
          </SectionCard>
        ))}

        {statements.length === 0 && (
          <SectionCard title="No records found">
            <EmptyState
              title="No capital records"
              description={
                isInvestorRole
                  ? 'No contributions have been recorded for your account yet.'
                  : 'Capital contributions have not been recorded for this portal view yet.'
              }
            />
          </SectionCard>
        )}
      </div>
    </>
  );
}
