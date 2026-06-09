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

  return (
    <>
      <PageHeader
        title="Operating engines"
        description="Black-box interface for UNDC and AFH: capital, returned profit, Brand Score inputs, and validation gates."
        action={<ActionDrawer label="Engine actions" title="Engine actions"><EngineActionsForm /></ActionDrawer>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Operating Alpha" value={money(operatingAlpha)} />
        <KpiCard label="Active engines" value={String(scores.length)} />
        <KpiCard label="Validation capped" value={String(scores.filter((item) => item.engine.validationGate || item.insufficientData).length)} state="WATCH" />
      </div>
      <div className="mt-5">
        <SectionCard title="Brand Score allocation">
          <DataTable
            headers={['Engine', 'Status', 'Brand Score', 'Allocation', 'Allocation %', 'Reason']}
            rows={scores.map((score) => {
              const allocation = allocations.find((item) => item.engineCode === score.engine.code);
              return [
                <span key="engine" className="font-medium">{score.engine.code}</span>,
                <StatusBadge key="status" state={score.engine.status === 'ACTIVE' ? 'GREEN' : 'WATCH'}>{score.engine.status}</StatusBadge>,
                score.insufficientData ? <StatusBadge key="tbc" state="WATCH">Insufficient data</StatusBadge> : score.brandScore?.toFixed(4),
                money(allocation?.allocation ?? null),
                pct(allocation?.allocationPct ?? null),
                <span key="reason" className="text-brand-muted">{allocation?.reason ?? 'Performance-weighted'}</span>,
              ];
            })}
          />
        </SectionCard>
      </div>
      <div className="mt-5">
        <SectionCard title="Performance inputs" description="Values are normalized on a 0-1 scale before scoring.">
          <DataTable
            headers={['Engine', 'ROIC', 'Cash conversion', 'Sell-through', 'Repeat demand', 'Operational risk']}
            rows={scores.map(({ engine }) => [
              <span key="engine" className="font-medium">{engine.code}</span>,
              pct(engine.roic),
              pct(engine.cashConversion),
              pct(engine.sellThrough),
              pct(engine.repeatDemand),
              pct(engine.operationalRisk),
            ])}
          />
        </SectionCard>
      </div>
    </>
  );
}
