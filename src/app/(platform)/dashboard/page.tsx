import type { Metadata } from 'next';
import { DataTable } from '@/components/app/data-table';
import { ExchangeRateCard } from '@/components/app/exchange-rate-card';
import { KpiCard } from '@/components/app/kpi-card';
import { PageNav } from '@/components/app/page-nav';
import { PageHeader } from '@/components/app/page-header';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { SleeveDonutChart } from '@/components/charts/sleeve-donut';
import { PCRGauge } from '@/components/charts/pcr-gauge';
import { NavBreakdownBar } from '@/components/charts/nav-breakdown';
import { loadPlatformState } from '@/lib/data/queries';
import { Decimal } from '@/lib/finance';
import { getCurrentUser } from '@/lib/auth/server';
import { sleeveColor } from '@/lib/platform/chart-colors';
import { pcrStatusLabel, cycleStatusLabel } from '@/lib/platform/labels';
import {
  getActiveSleeves,
  getLiquidityCliffRadar,
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
  const liquidityCliff = getLiquidityCliffRadar(state);
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
      <PageNav items={isInvestorRole ? [
        { id: 'overview', label: 'Overview' },
        { id: 'fund-overview', label: 'Fund overview' },
      ] : [
        { id: 'overview', label: 'Overview' },
        { id: 'coverage', label: 'Coverage' },
        { id: 'nav-composition', label: 'NAV' },
        { id: 'actions', label: 'Actions' },
        { id: 'liquidity-cliff', label: 'Liquidity' },
        { id: 'sleeves', label: 'Sleeves' },
        { id: 'entries', label: 'Entries' },
      ]} />

      {/* ── KPI cards ── */}
      <div id="overview" className="kpi-scroll-row scroll-mt-24 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Current NAV"
          value={money(overview.currentNAV)}
          amount={overview.currentNAV.toNumber()}
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
            `Capital principal due: ${money(overview.investorPrincipalDue)}`,
            `Ratio: ${money(overview.pcr.liquidAssets)} / ${money(overview.investorPrincipalDue)}`,
            `Status: ${overview.pcr.status}`,
          ]}
        />
        <KpiCard
          label="Liquid assets"
          value={money(overview.pcr.liquidAssets)}
          amount={overview.pcr.liquidAssets.toNumber()}
          detail="Excludes GSE and loan principal"
          breakdown={[
            `Protection sleeve: ${money(getSleeveAmount('PROTECTION', state))}`,
            `T-Bills: ${money(overview.marketPolicy.currentValues.tbill)}`,
            `Cash: ${money(overview.marketPolicy.currentValues.cash)}`,
          ]}
        />
        <KpiCard label="Capital principal due" value={money(overview.investorPrincipalDue)} amount={overview.investorPrincipalDue.toNumber()} detail={overview.activeCycle.status} trend={getTrendData('investorPrincipalDue', state)} />
      </div>

      {/* ── Capital partner metrics (not shown to partner role) ── */}
      {!isInvestorRole && state.investorCycles.length > 0 && (() => {
        const activeCycles = state.investorCycles.filter((ic) => ic.status === 'ACTIVE');
        const maturedCycles = state.investorCycles.filter((ic) => ic.status === 'MATURED');
        const totalActiveCapital = activeCycles.reduce((s, ic) => s.plus(ic.investmentAmount), new Decimal(0));
        const returnsdue = activeCycles.reduce((s, ic) => s.plus(ic.preferredReturn), new Decimal(0));
        const giftsDue = state.investorCycles.filter((ic) => ic.giftEligible && ic.giftStatus === 'DUE').length;
        const pendingPayout = maturedCycles.filter((ic) => !ic.reinvestmentConfirmed).length;

        return (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Partner capital" value={money(totalActiveCapital)} detail={`${activeCycles.length} active cycle(s)`} />
            <KpiCard label="Preferred returns due" value={money(returnsdue)} detail="Active cycles" state={returnsdue.gt(0) ? 'WATCH' : 'GREEN'} />
            <KpiCard label="Awaiting payout" value={String(pendingPayout)} detail="Matured, no decision" state={pendingPayout > 0 ? 'BREACH' : 'GREEN'} />
            <KpiCard label="Gifts due" value={String(giftsDue)} detail="Eligible, not delivered" state={giftsDue > 0 ? 'WATCH' : 'GREEN'} />
          </div>
        );
      })()}

      {/* ── Cycle-end actions alert ── */}
      {!isInvestorRole && state.investorCycles.length > 0 && (() => {
        const maturedCycles = state.investorCycles.filter((ic) => ic.status === 'MATURED');
        const giftsDue = state.investorCycles.filter((ic) => ic.giftEligible && ic.giftStatus === 'DUE');
        const pendingReinvestment = maturedCycles.filter((ic) => !ic.reinvestmentConfirmed);
        const missingDocs = state.investorCycles.filter((ic) => ic.status === 'ACTIVE' && !ic.agreementUploaded);

        if (maturedCycles.length === 0 && giftsDue.length === 0 && missingDocs.length === 0) return null;

        return (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">Cycle-end actions required</p>
            <ul className="space-y-1 text-xs text-amber-700">
              {maturedCycles.length > 0 && <li>• {maturedCycles.length} capital cycle(s) matured — awaiting payout decision</li>}
              {pendingReinvestment.length > 0 && <li>• {pendingReinvestment.length} partner(s) waiting for reinvestment confirmation</li>}
              {giftsDue.length > 0 && <li>• {giftsDue.length} gift(s) due for eligible partners</li>}
              {missingDocs.length > 0 && <li>• {missingDocs.length} partner(s) missing signed agreement</li>}
            </ul>
          </div>
        );
      })()}

      {/* ── Charts row: PCR gauge + Sleeve donut (operational) ── */}
      {!isInvestorRole && (
        <div id="coverage" className="mt-5 grid scroll-mt-24 gap-5 md:grid-cols-2">
          <SectionCard title="Principal coverage" description="PCR gauge against BREACH / WATCH / GREEN thresholds." accent="navy">
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

      {/* ── NAV breakdown bar (operational) ── */}
      {!isInvestorRole && (
        <div id="nav-composition" className="mt-5 scroll-mt-24">
          <SectionCard title="NAV composition" description="How the fund's net asset value breaks down. Red marker shows capital principal due.">
            <NavBreakdownBar
              segments={navSegments}
              principalDue={overview.investorPrincipalDue.toNumber()}
              totalNAV={overview.currentNAV.toNumber()}
            />
          </SectionCard>
        </div>
      )}

      {/* ── Action required + Risk posture (operational) ── */}
      {!isInvestorRole && (
        <div id="actions" className="mt-5 grid scroll-mt-24 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Action required" description="Highest-priority items that need management attention." accent={overview.riskBreaches > 0 ? 'danger' : 'success'}>
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

      {!isInvestorRole && (
        <div id="liquidity-cliff" className="mt-5 scroll-mt-24">
          <SectionCard
            title="Liquidity cliff radar"
            description="Projects whether liquid capital can cover capital obligations and remaining cycle outflows before the cycle closes."
            accent={liquidityCliff.status === 'BREACH' ? 'danger' : liquidityCliff.status === 'WATCH' ? 'warning' : 'success'}
          >
            <div className="grid gap-3 md:grid-cols-4">
              <KpiCard label="Available buffer" value={money(liquidityCliff.availableBuffer)} amount={liquidityCliff.availableBuffer.toNumber()} state={liquidityCliff.status} detail="Liquid assets minus principal due" />
              <KpiCard label="Projected outflows" value={money(liquidityCliff.projectedOutflows)} amount={liquidityCliff.projectedOutflows.toNumber()} detail="Run-rate plus pending loans" />
              <KpiCard label="Cliff date" value={liquidityCliff.cliffDate ?? 'No cliff'} detail={liquidityCliff.daysUntilCliff === null ? 'No burn detected' : `${liquidityCliff.daysUntilCliff} days`} state={liquidityCliff.status} />
              <KpiCard label="Cycle days left" value={String(liquidityCliff.daysUntilCycleEnd)} detail={liquidityCliff.action} state={liquidityCliff.status} />
            </div>
            <div className="mt-3 rounded-md border border-brand-line bg-brand-panel px-3 py-3 text-sm text-brand-charcoal">
              <p className="font-semibold text-brand-black">{liquidityCliff.action}</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {liquidityCliff.drivers.map((driver) => (
                  <li key={driver} className="text-brand-muted">{driver}</li>
                ))}
              </ul>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Sleeve table + Alerts (operational) ── */}
      {!isInvestorRole && (
        <div id="sleeves" className="mt-5 grid scroll-mt-24 gap-5 xl:grid-cols-2">
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
              <KpiCard label="Cycle status" value={cycleStatusLabel(overview.activeCycle.status)} />
            </div>
            <div className="mt-3">
              <ExchangeRateCard />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Fund overview (shown to partner role) ── */}
      {isInvestorRole && (
        <div id="fund-overview" className="mt-5 scroll-mt-24">
          <SectionCard title="Fund overview" description="Key fund metrics visible to all capital partners.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard label="PCR status" value={pcrStatusLabel(overview.pcr.status)} state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'} />
              <KpiCard label="Active cycle" value={`Cycle ${overview.activeCycle.sequenceNo}`} detail={cycleStatusLabel(overview.activeCycle.status)} />
              <KpiCard label="Cycle period" value={`${overview.activeCycle.startDate} — ${overview.activeCycle.endDate}`} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Recent ledger entries (operational) ── */}
      {!isInvestorRole && (
        <div id="entries" className="mt-5 scroll-mt-24">
          <SectionCard title="Recent entries" description="Latest ledger movements connected to the active operating record.">
            <DataTable
              headers={['Date', 'Account', 'Description', 'Direction', 'Amount', 'Source']}
              maxHeight="max-h-64"
              rows={recentEntries.map((entry) => [
                entry.date,
                <span key="account" className="font-medium">{entry.account.toLowerCase() === 'investor capital' ? 'Partner capital' : entry.account}</span>,
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
