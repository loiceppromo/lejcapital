import { ActionDrawer } from '@/components/app/action-drawer';
import { CycleActionsForm } from '@/components/app/cycle-form';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { Decimal } from '@/lib/finance';
import { getActiveCycle, getActiveSleeves, getWaterfall, money } from '@/lib/platform/selectors';

export default async function CyclesPage() {
  const state = await loadPlatformState();
  const activeCycle = getActiveCycle(state);
  const sleeves = getActiveSleeves(state);
  const waterfall = getWaterfall(state);
  const fundedTotal = sleeves.reduce((sum, sleeve) => sum.plus(sleeve.fundedAmount), new Decimal(0));
  const targetTotal = sleeves.reduce((sum, sleeve) => sum.plus(sleeve.targetAmount ?? new Decimal(0)), new Decimal(0));
  const unpaidWaterfallLines = waterfall.filter((line) => !line.fullyPaid).length;
  const cycleOptions = state.cycles.map((cycle) => ({
    id: cycle.id,
    label: `Cycle ${cycle.sequenceNo} · ${cycle.status}`,
  }));

  return (
    <>
      <PageHeader
        title="Cycles"
        description="Cycle lifecycle, sleeve sizing, retained capital carry-forward, and close waterfall."
        action={<ActionDrawer label="Cycle actions" title="Cycle actions"><CycleActionsForm cycles={cycleOptions} /></ActionDrawer>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Active cycle" value={`Cycle ${activeCycle.sequenceNo}`} detail={`${activeCycle.startDate} to ${activeCycle.endDate}`} state={activeCycle.status === 'ACTIVE' ? 'GREEN' : 'WATCH'} />
        <KpiCard label="Opening NAV" value={money(activeCycle.openingNAV)} />
        <KpiCard label="Retained capital" value={money(activeCycle.retainedCapital)} />
        <KpiCard label="Sleeve funded" value={money(fundedTotal)} detail={`Target ${money(targetTotal)}`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Cycle timeline" description="Full multi-cycle history with lifecycle status and carry-forward values.">
          <DataTable
            headers={['Cycle', 'Dates', 'Status', 'Opening NAV', 'Retained']}
            rows={state.cycles.map((cycle) => [
              `Cycle ${cycle.sequenceNo}`,
              `${cycle.startDate} - ${cycle.endDate}`,
              <StatusBadge key="status" state={cycle.status === 'ACTIVE' ? 'GREEN' : cycle.status === 'CLOSED' ? 'NEUTRAL' : 'WATCH'}>{cycle.status}</StatusBadge>,
              <span key="opening" className="font-mono">{money(cycle.openingNAV)}</span>,
              <span key="retained" className="font-mono">{money(cycle.retainedCapital)}</span>,
            ])}
          />
        </SectionCard>

        <SectionCard title="Sleeve sizing" description="Protection and reserve funding are separated from alpha deployment.">
          <DataTable
            headers={['Sleeve', 'Target', 'Funded', 'Floor', 'Notes']}
            rows={sleeves.map((sleeve) => [
              <span key="type" className="font-medium">{sleeve.type.replaceAll('_', ' ')}</span>,
              <span key="target" className="font-mono">{money(sleeve.targetAmount)}</span>,
              <span key="funded" className="font-mono font-semibold">{money(sleeve.fundedAmount)}</span>,
              <span key="floor" className="font-mono">{money(sleeve.floorAmount)}</span>,
              <span key="notes" className="text-brand-muted">{sleeve.notes}</span>,
            ])}
          />
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard
          title="Waterfall"
          description="Strict priority order at cycle close. No lower claim is funded until higher priority claims are fully paid."
          action={<StatusBadge state={unpaidWaterfallLines > 0 ? 'WATCH' : 'GREEN'}>{unpaidWaterfallLines} open</StatusBadge>}
        >
          <DataTable
            headers={['Priority', 'Claim', 'Claimed', 'Paid', 'Status', 'Cash after']}
            rows={waterfall.map((line) => [
              line.priority,
              line.claimType.replaceAll('_', ' '),
              <span key="claimed" className="font-mono">{money(line.amountClaimed)}</span>,
              <span key="paid" className="font-mono font-semibold">{money(line.amountPaid)}</span>,
              <StatusBadge key="paid" state={line.fullyPaid ? 'GREEN' : 'WATCH'}>{line.fullyPaid ? 'Paid' : 'Unpaid'}</StatusBadge>,
              money(line.cashAfter),
            ])}
          />
        </SectionCard>
      </div>
    </>
  );
}
