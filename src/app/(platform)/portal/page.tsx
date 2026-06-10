import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import {
  getActiveCycle,
  getInvestorStatements,
  getOverview,
  money,
  ratio,
} from '@/lib/platform/selectors';
import { Decimal } from '@/lib/finance';

export default async function InvestorPortalPage() {
  const state = await loadPlatformState();
  const overview = getOverview(state);
  const activeCycle = getActiveCycle(state);
  const statements = getInvestorStatements(state);

  const totalContributed = statements.reduce(
    (sum, s) => sum.plus(s.totalContributed),
    new Decimal(0),
  );
  const totalRepaid = statements.reduce(
    (sum, s) => sum.plus(s.totalRepaid),
    new Decimal(0),
  );
  const outstandingPrincipal = totalContributed.minus(totalRepaid);

  return (
    <>
      <PageHeader
        title="Investor portal"
        description="Read-only view of your capital position, contributions, and cycle status."
      />

      {/* Fund-level KPIs visible to investors */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          label="Total contributed"
          value={money(totalContributed)}
          detail={`${statements.length} investor(s)`}
        />
        <KpiCard
          label="Outstanding principal"
          value={money(outstandingPrincipal)}
          detail="Contributions minus repayments"
        />
      </div>

      {/* Investor statements */}
      <div className="mt-5 space-y-5">
        {statements.map((stmt) => (
          <SectionCard
            key={stmt.investor.id}
            title={stmt.investor.name}
            description={`Contact: ${stmt.investor.contact || 'Not provided'}`}
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
              rows={state.contributions
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
            {state.repayments.filter((r) => r.investorId === stmt.investor.id).length > 0 && (
              <>
                <h3 className="mb-2 mt-4 text-sm font-semibold text-brand-charcoal">Repayments</h3>
                <DataTable
                  headers={['Date', 'Cycle', 'Principal due', 'Amount repaid']}
                  maxHeight="max-h-48"
                  rows={state.repayments
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
          <SectionCard title="No investor records">
            <p className="text-sm text-brand-muted">No investor contributions have been recorded yet.</p>
          </SectionCard>
        )}
      </div>
    </>
  );
}
