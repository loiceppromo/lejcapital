import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import {
  getActiveSleeves,
  getOverview,
  getRiskItems,
  money,
  pct,
  ratio,
} from '@/lib/platform/selectors';

export default async function DashboardPage() {
  const state = await loadPlatformState();
  const overview = getOverview(state);
  const sleeves = getActiveSleeves(state);
  const riskItems = getRiskItems(state);
  const recentEntries = [...state.ledgerEntries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Executive dashboard"
        description="Private capital overview for the active cycle. Operational forms and detailed records live in their dedicated modules."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Current NAV" value={money(overview.currentNAV)} detail="Net of provisions" />
        <KpiCard
          label="PCR"
          value={ratio(overview.pcr.pcr)}
          detail="Liquid assets / principal due"
          state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}
        />
        <KpiCard label="Liquid assets" value={money(overview.pcr.liquidAssets)} detail="Excludes GSE and loan principal" />
        <KpiCard label="Investor principal due" value={money(overview.investorPrincipalDue)} detail={overview.activeCycle.status} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Action required" description="Highest-priority items that need management attention.">
          <div className="space-y-2">
            {overview.actionRequired.length === 0 ? (
              <div className="rounded-md border border-brand-line bg-brand-panel px-3 py-3 text-sm text-brand-muted">
                No open required actions.
              </div>
            ) : (
              overview.actionRequired.map((action) => (
                <div key={action} className="rounded-md border border-brand-line bg-brand-panel px-3 py-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#9b2f28]" />
                    <span>{action}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Risk posture" description="Compact status view across capital, market, engines, and loans.">
          <DataTable
            headers={['Metric', 'Value', 'Status', 'Action']}
            rows={riskItems.map((item) => [
              <span key="metric" className="font-medium">{item.label}</span>,
              item.value,
              <StatusBadge key="status" state={item.state}>{item.state}</StatusBadge>,
              <span key="action" className="text-brand-muted">{item.action}</span>,
            ])}
          />
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Current sleeve allocation">
          <DataTable
            headers={['Sleeve', 'Funded', 'Target', 'Notes']}
            rows={sleeves.map((sleeve) => [
              <span key="type" className="font-medium">{sleeve.type.replaceAll('_', ' ')}</span>,
              money(sleeve.fundedAmount),
              money(sleeve.targetAmount),
              <span key="note" className="text-brand-muted">{sleeve.notes}</span>,
            ])}
          />
        </SectionCard>

        <SectionCard title="Latest alerts" description="Derived from current controls and missing-data checks.">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard label="Risk breaches" value={String(overview.riskBreaches)} state={overview.riskBreaches > 0 ? 'BREACH' : 'GREEN'} />
            <KpiCard label="GSE exposure" value={pct(overview.marketPolicy.gseExposure.currentPct)} state={overview.marketPolicy.gseExposure.withinLimit ? 'GREEN' : 'BREACH'} />
            <KpiCard label="Loan PAR > 30" value={pct(overview.loanMetrics.par30)} state={overview.loanMetrics.par30.lte('0.05') ? 'GREEN' : 'WATCH'} />
            <KpiCard label="Cycle status" value={overview.activeCycle.status} />
          </div>
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard title="Recent entries" description="Latest ledger movements connected to the active operating record.">
          <DataTable
            headers={['Date', 'Account', 'Description', 'Direction', 'Amount', 'Source']}
            maxHeight="max-h-64"
            rows={recentEntries.map((entry) => [
              entry.date,
              <span key="account" className="font-medium">{entry.account}</span>,
              <span key="description" className="text-brand-muted">{entry.description}</span>,
              <StatusBadge key="direction" state={entry.direction === 'IN' ? 'GREEN' : 'NEUTRAL'}>{entry.direction}</StatusBadge>,
              <span key="amount" className="font-mono">{money(entry.amount)}</span>,
              <span key="source" className="text-xs text-brand-muted">{entry.source}</span>,
            ])}
          />
        </SectionCard>
      </div>
    </>
  );
}
