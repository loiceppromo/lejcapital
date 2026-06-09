import { ActionDrawer } from '@/components/app/action-drawer';
import { CycleActionsForm } from '@/components/app/cycle-form';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { getActiveCycle, getActiveSleeves, getWaterfall, money } from '@/lib/platform/selectors';

export default async function CyclesPage() {
  const state = await loadPlatformState();
  const activeCycle = getActiveCycle(state);
  const sleeves = getActiveSleeves(state);
  const waterfall = getWaterfall(state);

  return (
    <>
      <PageHeader
        title="Cycles"
        description="Cycle lifecycle, sleeve sizing, retained capital carry-forward, and close waterfall."
        action={<ActionDrawer label="Cycle actions" title="Cycle actions"><CycleActionsForm /></ActionDrawer>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Active cycle" value={`Cycle ${activeCycle.sequenceNo}`} detail={`${activeCycle.startDate} to ${activeCycle.endDate}`} />
        <KpiCard label="Opening NAV" value={money(activeCycle.openingNAV)} />
        <KpiCard label="Retained capital" value={money(activeCycle.retainedCapital)} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Cycle timeline">
          <DataTable
            headers={['Cycle', 'Dates', 'Status', 'Opening NAV', 'Retained']}
            rows={state.cycles.map((cycle) => [
              `Cycle ${cycle.sequenceNo}`,
              `${cycle.startDate} - ${cycle.endDate}`,
              <StatusBadge key="status">{cycle.status}</StatusBadge>,
              money(cycle.openingNAV),
              money(cycle.retainedCapital),
            ])}
          />
        </SectionCard>

        <SectionCard title="Sleeve sizing">
          <DataTable
            headers={['Sleeve', 'Target', 'Funded', 'Floor', 'Notes']}
            rows={sleeves.map((sleeve) => [
              <span key="type" className="font-medium">{sleeve.type.replaceAll('_', ' ')}</span>,
              money(sleeve.targetAmount),
              money(sleeve.fundedAmount),
              money(sleeve.floorAmount),
              <span key="notes" className="text-brand-muted">{sleeve.notes}</span>,
            ])}
          />
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard title="Waterfall" description="Strict priority order at cycle close.">
          <DataTable
            headers={['Priority', 'Claim', 'Claimed', 'Paid', 'Status', 'Cash after']}
            rows={waterfall.map((line) => [
              line.priority,
              line.claimType.replaceAll('_', ' '),
              money(line.amountClaimed),
              money(line.amountPaid),
              <StatusBadge key="paid" state={line.fullyPaid ? 'GREEN' : 'WATCH'}>{line.fullyPaid ? 'Paid' : 'Unpaid'}</StatusBadge>,
              money(line.cashAfter),
            ])}
          />
        </SectionCard>
      </div>
    </>
  );
}

