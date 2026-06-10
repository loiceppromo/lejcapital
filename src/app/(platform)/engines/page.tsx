import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { EngineActionsForm } from '@/components/app/engine-form';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { getEngineAllocation, getSleeveAmount, money, pct } from '@/lib/platform/selectors';

export default async function EnginesPage() {
  const state = await loadPlatformState();
  const { scores, allocations } = getEngineAllocation(state);
  const operatingAlpha = getSleeveAmount('OPERATING_ALPHA', state);
  const validationCapped = scores.filter((item) => item.engine.validationGate || item.insufficientData).length;
  const activeEngines = scores.filter((item) => item.engine.status === 'ACTIVE').length;
  const engineOptions = Array.from(
    new Map(
      state.engineRecords.map((engine) => [
        engine.engineId ?? engine.id,
        {
          id: engine.engineId ?? engine.id,
          label: `${engine.code} · ${engine.status}`,
        },
      ]),
    ).values(),
  );
  const cycleOptions = state.cycles.map((cycle) => ({
    id: cycle.id,
    label: `Cycle ${cycle.sequenceNo} · ${cycle.status}`,
  }));

  return (
    <>
      <PageHeader
        title="Operating engines"
        description="Black-box interface for UNDC and AFH: capital, returned profit, Brand Score inputs, and validation gates."
        action={<ActionDrawer label="Engine actions" title="Engine actions"><EngineActionsForm engines={engineOptions} cycles={cycleOptions} /></ActionDrawer>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Operating Alpha" value={money(operatingAlpha)} />
        <KpiCard label="Active engines" value={String(activeEngines)} detail={`${scores.length} tracked`} />
        <KpiCard label="Validation capped" value={String(validationCapped)} state={validationCapped > 0 ? 'WATCH' : 'GREEN'} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Brand Score allocation" description="Operating Alpha split after validation caps, TBC handling, and allocation floors.">
          <DataTable
            headers={['Engine', 'Status', 'Brand Score', 'Allocation', 'Allocation %', 'Reason']}
            rows={scores.map((score) => {
              const allocation = allocations.find((item) => item.engineCode === score.engine.code);
              return [
                <span key="engine" className="font-medium">{score.engine.code}</span>,
                <StatusBadge key="status" state={score.engine.status === 'ACTIVE' ? 'GREEN' : 'WATCH'}>{score.engine.status}</StatusBadge>,
                score.insufficientData ? <StatusBadge key="tbc" state="WATCH">TBC inputs</StatusBadge> : <span key="score" className="font-mono">{score.brandScore?.toFixed(4)}</span>,
                <span key="allocation" className="font-mono font-semibold">{money(allocation?.allocation ?? null)}</span>,
                <span key="pct" className="font-mono">{pct(allocation?.allocationPct ?? null)}</span>,
                <span key="reason" className="text-brand-muted">{allocation?.reason ?? 'Performance-weighted'}</span>,
              ];
            })}
          />
        </SectionCard>

        <SectionCard title="Validation gates" description="Engines without complete data remain capped until IC review clears them.">
          <DataTable
            headers={['Engine', 'Gate', 'Data', 'Suggested state']}
            rows={scores.map((score) => [
              <span key="engine" className="font-medium">{score.engine.code}</span>,
              <StatusBadge key="gate" state={score.engine.validationGate ? 'WATCH' : 'GREEN'}>{score.engine.validationGate ? 'CAPPED' : 'OPEN'}</StatusBadge>,
              <StatusBadge key="data" state={score.insufficientData ? 'WATCH' : 'GREEN'}>{score.insufficientData ? 'TBC' : 'COMPLETE'}</StatusBadge>,
              <span key="state" className="text-brand-muted">{score.engine.validationGate || score.insufficientData ? 'Maintain cap' : 'Eligible for weighted allocation'}</span>,
            ])}
          />
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard title="Performance inputs" description="Values are normalized on a 0-1 scale before scoring. TBC values prevent full performance weighting.">
          <DataTable
            headers={['Engine', 'ROIC', 'Cash conversion', 'Sell-through', 'Repeat demand', 'Operational risk']}
            rows={scores.map(({ engine }) => [
              <span key="engine" className="font-medium">{engine.code}</span>,
              <span key="roic" className="font-mono">{pct(engine.roic)}</span>,
              <span key="cash" className="font-mono">{pct(engine.cashConversion)}</span>,
              <span key="sell" className="font-mono">{pct(engine.sellThrough)}</span>,
              <span key="repeat" className="font-mono">{pct(engine.repeatDemand)}</span>,
              <span key="risk" className="font-mono">{pct(engine.operationalRisk)}</span>,
            ])}
          />
        </SectionCard>
      </div>
    </>
  );
}
