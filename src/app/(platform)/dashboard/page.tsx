import type { Metadata } from 'next';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { SleeveDonutChart } from '@/components/charts/sleeve-donut';
import { PCRGauge } from '@/components/charts/pcr-gauge';
import { NavBreakdownBar } from '@/components/charts/nav-breakdown';
import { loadPlatformState } from '@/lib/data/queries';
import { getCurrentUser } from '@/lib/auth/server';
import { sleeveColor } from '@/lib/platform/chart-colors';
import {
  getActiveSleeves,
  getOverview,
  getRiskItems,
  getSleeveAmount,
  getTrendData,
  money,
  pct,
  ratio,
} from '@/lib/platform/selectors';

export const metadata: Metadata = { title: 'Dashboard | LEJ Capital' };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [state, user] = await Promise.all([loadPlatformState(), getCurrentUser()]);
  const overview = getOverview(state);
  const isInvestorRole = user.role === 'INVESTOR';
  const sleeves = getActiveSleeves(state);
  const riskItems = getRiskItems(state);
  const recentEntries = [...state.ledgerEntries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 6);

  // Chart data: sleeve donut
  const sleeveSegments = sleeves.map((s) => ({
    label: s.type,
    value: s.fundedAmount.toNumber(),
    color: sleeveColor(s.type),
  }));
  const totalFunded = sleeves.reduce((sum, s) => sum + s.fundedAmount.toNumber(), 0);

  // Chart data: NAV breakdown
  const protectionVal = getSleeveAmount('PROTECTION', state).toNumber();
  const reserveVal = getSleeveAmount('RESERVE', state).toNumber();
  const marketVal = overview.marketPolicy.currentValues.total.toNumber();
  const operatingVal = getSleeveAmount('OPERATING_ALPHA', state).toNumber();
  const loanNetVal = overview.loanMetrics.netValue.toNumber();
  const cashVal = overview.marketPolicy.currentValues.cash.toNumber();

  const navSegments = [
    { label: 'Protection', value: protectionVal, color: '#052b57' },
    { label: 'Reserve', value: reserveVal, color: '#1e6f5c' },
    { label: 'Market', value: marketVal, color: '#3b82f6' },
    { label: 'Operating', value: operatingVal, color: '#e67e22' },
    { label: 'Loan Book', value: loanNetVal, color: '#8b5cf6' },
    { label: 'Cash', value: cashVal, color: '#64748b' },
  ];

  return (
    <>
      {params?.error === 'access_denied' && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Access denied.</strong> You don&apos;t have permission to view that page. Contact a Fund Manager to request access.
        </div>
      )}
      <PrintHeader title="Executive Dashboard" subtitle={`Cycle ${overview.activeCycle.sequenceNo} · ${overview.activeCycle.status}`} />
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard' }]}
        title="Executive dashboard"
        description="Private capital overview for the active cycle. Operational forms and detailed records live in their dedicated modules."
        action={<PresentationToggle />}
      />

      {/* ── KPI cards ── */}
      <div className="kpi-scroll-row grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Current NAV"
          value={money(overview.currentNAV)}
          detail="Net of provisions"
          trend={getTrendData('currentNAV', state)}
          breakdown={[
            `Protection: ${money(getSleeveAmount('PROTECTION', state))}`,
            `Reserve: ${money(getSleeveAmount('RESERVE', state))}`,
            `Market portfolio: ${money(overview.marketPolicy.currentValues.total)}`,
            `Operating Alpha: ${money(getSleeveAmount('OPERATING_ALPHA', state))}`,
            `Loan book (net): ${money(overview.loanMetrics.netValue)}`,
            `Cash: ${money(overview.marketPolicy.currentValues.cash)}`,
          ]}
        />
        <KpiCard
          label="PCR"
          value={ratio(overview.pcr.pcr)}
          detail="Liquid assets / principal due"
          state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}
          trend={getTrendData('pcr', state)}
          breakdown={[
            `Liquid assets: ${money(overview.pcr.liquidAssets)}`,
            `Investor principal due: ${money(overview.investorPrincipalDue)}`,
            `Ratio: ${money(overview.pcr.liquidAssets)} / ${money(overview.investorPrincipalDue)}`,
            `Status: ${overview.pcr.status}`,
          ]}
        />
        <KpiCard
          label="Liquid assets"
          value={money(overview.pcr.liquidAssets)}
          detail="Excludes GSE and loan principal"
          breakdown={[
            `Protection sleeve: ${money(getSleeveAmount('PROTECTION', state))}`,
            `T-Bills: ${money(overview.marketPolicy.currentValues.tbill)}`,
            `Cash: ${money(overview.marketPolicy.currentValues.cash)}`,
          ]}
        />
        <KpiCard label="Investor principal due" value={money(overview.investorPrincipalDue)} detail={overview.activeCycle.status} trend={getTrendData('investorPrincipalDue', state)} />
      </div>

      {/* ── Charts row: PCR gauge + Sleeve donut (not shown to investors) ── */}
      {!isInvestorRole && (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <SectionCard title="Principal coverage" description="PCR gauge against BREACH / WATCH / GREEN thresholds.">
            <div className="flex justify-center py-2">
              <PCRGauge
                pcr={overview.pcr.pcr.toNumber()}
                status={overview.pcr.status}
                liquidAssets={money(overview.pcr.liquidAssets)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Sleeve allocation" description="Capital deployed across the five sleeve categories.">
            <div className="flex justify-center py-2">
              <SleeveDonutChart
                segments={sleeveSegments}
                centerValue={`GHS ${Math.round(totalFunded).toLocaleString()}`}
                centerLabel="Total funded"
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── NAV breakdown bar (not shown to investors) ── */}
      {!isInvestorRole && (
        <div className="mt-5">
          <SectionCard title="NAV composition" description="How the fund's net asset value breaks down. Red marker shows investor principal due.">
            <NavBreakdownBar
              segments={navSegments}
              principalDue={overview.investorPrincipalDue.toNumber()}
              totalNAV={overview.currentNAV.toNumber()}
            />
          </SectionCard>
        </div>
      )}

      {/* ── Action required + Risk posture (operational — not for investors) ── */}
      {!isInvestorRole && (
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
      )}

      {/* ── Sleeve table + Alerts (operational — not for investors) ── */}
      {!isInvestorRole && (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <SectionCard title="Sleeve detail">
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
      )}

      {/* ── Investor summary (shown only to investors) ── */}
      {isInvestorRole && (
        <div className="mt-5">
          <SectionCard title="Fund overview" description="Key fund metrics visible to all investors.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard label="PCR status" value={overview.pcr.status} state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'} />
              <KpiCard label="Active cycle" value={`Cycle ${overview.activeCycle.sequenceNo}`} detail={overview.activeCycle.status} />
              <KpiCard label="Cycle period" value={`${overview.activeCycle.startDate} — ${overview.activeCycle.endDate}`} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Recent ledger entries (operational — not for investors) ── */}
      {!isInvestorRole && (
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
      )}
    </>
  );
}
