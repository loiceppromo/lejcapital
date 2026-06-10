import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { guardPage } from '@/lib/auth/page-guard';
import { money } from '@/lib/platform/selectors';
import { Decimal } from '@/lib/finance';

export const metadata: Metadata = { title: 'Cycle Comparison | LEJ Capital' };

export default async function CycleComparePage() {
  await guardPage('/cycles');
  const state = await loadPlatformState();

  // Build per-cycle summary data
  const cycleSummaries = state.cycles
    .sort((a, b) => a.sequenceNo - b.sequenceNo)
    .map((cycle) => {
      const sleeves = state.sleevesByCycle[cycle.id] ?? [];
      const totalFunded = sleeves.reduce((sum, s) => sum.plus(s.fundedAmount), new Decimal(0));
      const totalTarget = sleeves.reduce((sum, s) => sum.plus(s.targetAmount ?? new Decimal(0)), new Decimal(0));
      const contributions = state.contributions.filter((c) => c.cycleId === cycle.id);
      const totalContributed = contributions.reduce((sum, c) => sum.plus(c.amount), new Decimal(0));
      const repayments = state.repayments.filter((r) => r.cycleId === cycle.id);
      const totalRepaid = repayments.reduce((sum, r) => sum.plus(r.amountRepaid), new Decimal(0));
      const loans = state.loans.filter((l) => l.fundingCycleId === cycle.id);
      const totalLoanPrincipal = loans.reduce((sum, l) => sum.plus(l.principal), new Decimal(0));
      const holdings = state.marketHoldings.filter((h) => h.cycleId === cycle.id);
      const totalMarketValue = holdings.reduce((sum, h) => sum.plus(h.currentValue), new Decimal(0));
      const waterfallRuns = state.waterfallRuns.filter((w) => w.cycleId === cycle.id);

      return {
        cycle,
        totalFunded,
        totalTarget,
        totalContributed,
        totalRepaid,
        totalLoanPrincipal,
        totalMarketValue,
        loanCount: loans.length,
        holdingCount: holdings.length,
        contributorCount: contributions.length,
        waterfallCount: waterfallRuns.length,
        sleeveBreakdown: sleeves,
      };
    });

  return (
    <>
      <PageHeader
        title="Cycle comparison"
        description="Side-by-side view of capital deployment, returns, and key metrics across cycles."
        action={
          <Link
            href="/cycles"
            className="rounded-md border border-brand-line bg-white px-3 py-2 text-sm font-semibold text-brand-black hover:bg-brand-panel"
          >
            Back to cycles
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total cycles" value={String(cycleSummaries.length)} />
        <KpiCard
          label="Active cycle"
          value={`Cycle ${cycleSummaries.find((s) => s.cycle.status === 'ACTIVE')?.cycle.sequenceNo ?? '-'}`}
        />
        <KpiCard label="Closed cycles" value={String(cycleSummaries.filter((s) => s.cycle.status === 'CLOSED').length)} />
      </div>

      {/* Main comparison table */}
      <div className="mt-5">
        <SectionCard title="Cycle-by-cycle comparison" description="Key metrics across all cycles. Amounts in GHS.">
          <div className="overflow-x-auto">
            <DataTable
              headers={['Metric', ...cycleSummaries.map((s) => `Cycle ${s.cycle.sequenceNo}`)]}
              rows={[
                [
                  <span key="h" className="font-semibold">Status</span>,
                  ...cycleSummaries.map((s) => (
                    <StatusBadge key={s.cycle.id} state={s.cycle.status === 'ACTIVE' ? 'GREEN' : s.cycle.status === 'CLOSED' ? 'NEUTRAL' : 'WATCH'}>
                      {s.cycle.status}
                    </StatusBadge>
                  )),
                ],
                [
                  <span key="h" className="font-semibold">Period</span>,
                  ...cycleSummaries.map((s) => (
                    <span key={s.cycle.id} className="text-xs">{s.cycle.startDate} to {s.cycle.endDate}</span>
                  )),
                ],
                [
                  <span key="h" className="font-semibold">Opening NAV</span>,
                  ...cycleSummaries.map((s) => (
                    <span key={s.cycle.id} className="font-mono">{s.cycle.openingNAV ? money(s.cycle.openingNAV) : 'TBC'}</span>
                  )),
                ],
                [
                  <span key="h" className="font-semibold">Closing NAV</span>,
                  ...cycleSummaries.map((s) => (
                    <span key={s.cycle.id} className="font-mono">{s.cycle.closingNAV ? money(s.cycle.closingNAV) : 'TBC'}</span>
                  )),
                ],
                [
                  <span key="h" className="font-semibold">Capital deployed</span>,
                  ...cycleSummaries.map((s) => (
                    <span key={s.cycle.id} className="font-mono">{money(s.totalFunded)}</span>
                  )),
                ],
                [
                  <span key="h" className="font-semibold">Investor contributions</span>,
                  ...cycleSummaries.map((s) => (
                    <span key={s.cycle.id} className="font-mono">{money(s.totalContributed)}</span>
                  )),
                ],
                [
                  <span key="h" className="font-semibold">Investor repayments</span>,
                  ...cycleSummaries.map((s) => (
                    <span key={s.cycle.id} className="font-mono">{money(s.totalRepaid)}</span>
                  )),
                ],
                [
                  <span key="h" className="font-semibold">Loan principal</span>,
                  ...cycleSummaries.map((s) => (
                    <span key={s.cycle.id} className="font-mono">{money(s.totalLoanPrincipal)}</span>
                  )),
                ],
                [
                  <span key="h" className="font-semibold">Market value</span>,
                  ...cycleSummaries.map((s) => (
                    <span key={s.cycle.id} className="font-mono">{money(s.totalMarketValue)}</span>
                  )),
                ],
                [
                  <span key="h" className="font-semibold">Loans</span>,
                  ...cycleSummaries.map((s) => <span key={s.cycle.id}>{s.loanCount}</span>),
                ],
                [
                  <span key="h" className="font-semibold">Holdings</span>,
                  ...cycleSummaries.map((s) => <span key={s.cycle.id}>{s.holdingCount}</span>),
                ],
                [
                  <span key="h" className="font-semibold">Waterfall runs</span>,
                  ...cycleSummaries.map((s) => <span key={s.cycle.id}>{s.waterfallCount}</span>),
                ],
              ]}
            />
          </div>
        </SectionCard>
      </div>

      {/* Sleeve breakdown per cycle */}
      <div className="mt-5">
        <SectionCard title="Sleeve allocation by cycle" description="How capital was sized across the five sleeve categories each cycle.">
          <DataTable
            headers={['Cycle', 'Protection', 'Reserve', 'Operating', 'Market', 'Loan Book', 'Total']}
            rows={cycleSummaries.map((s) => {
              const getSleeve = (type: string) => s.sleeveBreakdown.find((sl) => sl.type === type)?.fundedAmount ?? new Decimal(0);
              return [
                <span key="c" className="font-semibold">Cycle {s.cycle.sequenceNo}</span>,
                <span key="p" className="font-mono">{money(getSleeve('PROTECTION'))}</span>,
                <span key="r" className="font-mono">{money(getSleeve('RESERVE'))}</span>,
                <span key="o" className="font-mono">{money(getSleeve('OPERATING_ALPHA'))}</span>,
                <span key="m" className="font-mono">{money(getSleeve('MARKET_ALPHA'))}</span>,
                <span key="l" className="font-mono">{money(getSleeve('LOAN_BOOK'))}</span>,
                <span key="t" className="font-mono font-semibold">{money(s.totalFunded)}</span>,
              ];
            })}
          />
        </SectionCard>
      </div>
    </>
  );
}
