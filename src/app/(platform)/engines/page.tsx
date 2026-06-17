import type { Metadata } from 'next';
import Image from 'next/image';
import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { EngineActionsForm } from '@/components/app/engine-form';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { PageNav } from '@/components/app/page-nav';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { getEngineAllocation, getSleeveAmount, money, pct } from '@/lib/platform/selectors';
import { toCycleOptions } from '@/lib/platform/cycle-utils';
import { guardPage } from '@/lib/auth/page-guard';
import { canAccess } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Businesses | LEJ Capital' };

export default async function EnginesPage() {
  const { role } = await guardPage('/engines');
  const state = await loadPlatformState();
  const { scores, allocations } = getEngineAllocation(state);
  const operatingAlpha = getSleeveAmount('OPERATING_ALPHA', state);
  const validationCapped = scores.filter((item) => item.engine.validationGate || item.insufficientData).length;
  const activeEngines = scores.filter((item) => item.engine.status === 'ACTIVE').length;
  const engines = state.engines ?? [];
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
  const cycleOptions = toCycleOptions(state);

  const navItems = [
    { id: 'directory', label: 'Directory' },
    { id: 'allocation', label: 'Allocation' },
    { id: 'validation', label: 'Validation' },
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <>
      <PrintHeader title="Business Report" subtitle={`${activeEngines} active businesses · ${money(operatingAlpha)} Operating Alpha`} />
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Businesses' }]}
        title="Operating businesses"
        description="Capital deployment through manager-added operating businesses. Brand Score allocation, validation gates, and performance inputs."
        action={
          <div className="flex gap-2">
            <PresentationToggle />
            {canAccess(role, 'ADD_ENGINE') ? <ActionDrawer label="Actions" title="Business actions"><EngineActionsForm engines={engineOptions} cycles={cycleOptions} /></ActionDrawer> : null}
          </div>
        }
      />
      <PageNav items={navItems} />

      {/* ── KPI row ── */}
      <div className="kpi-scroll-row grid gap-4 md:grid-cols-3">
        <KpiCard label="Operating Alpha" value={money(operatingAlpha)} />
        <KpiCard label="Active businesses" value={String(activeEngines)} detail={`${scores.length} tracked`} />
        <KpiCard label="Validation capped" value={String(validationCapped)} state={validationCapped > 0 ? 'WATCH' : 'GREEN'} />
      </div>

      {/* ── Business directory ── */}
      <section id="directory" className="scroll-mt-24 mt-6">
        <SectionCard title="Business directory" description="Operating businesses deployed by LEJ Capital. Click Actions to add or edit businesses.">
          {engines.length === 0 ? (
            <p className="py-8 text-center text-sm text-brand-muted">No businesses registered yet. Use the Actions drawer to add one.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {engines.map((eng) => (
                <div key={eng.id} className="flex items-start gap-3 rounded-lg border border-brand-line bg-white p-4 transition-shadow hover:shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-panel">
                    {eng.logoUrl ? (
                      <Image src={eng.logoUrl} alt={`${eng.code} logo`} width={40} height={40} className="h-10 w-10 rounded object-contain" unoptimized />
                    ) : (
                      <span className="text-lg font-bold text-brand-navy">{eng.code.slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-brand-black">{eng.name}</h3>
                      <StatusBadge state={eng.status === 'ACTIVE' ? 'GREEN' : eng.status === 'EXITED' ? 'BREACH' : 'WATCH'}>
                        {eng.status}
                      </StatusBadge>
                    </div>
                    <p className="text-xs font-mono text-brand-muted">{eng.code}</p>
                    {eng.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-brand-charcoal">{eng.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      {/* ── Brand Score allocation ── */}
      <section id="allocation" className="scroll-mt-24 mt-5">
        <SectionCard title="Brand Score allocation" description="Operating Alpha split after validation caps, TBC handling, and allocation floors.">
          <DataTable
            headers={['Business', 'Status', 'Brand Score', 'Allocation', '%', 'Reason']}
            rows={scores.map((score) => {
              const allocation = allocations.find((item) => item.engineCode === score.engine.code);
              return [
                <span key="engine" className="font-medium">{score.engine.code}</span>,
                <StatusBadge key="status" state={score.engine.status === 'ACTIVE' ? 'GREEN' : 'WATCH'}>{score.engine.status}</StatusBadge>,
                score.insufficientData ? <StatusBadge key="tbc" state="WATCH">TBC</StatusBadge> : <span key="score" className="font-mono">{score.brandScore?.toFixed(4)}</span>,
                <span key="allocation" className="font-mono font-semibold">{money(allocation?.allocation ?? null)}</span>,
                <span key="pct" className="font-mono">{pct(allocation?.allocationPct ?? null)}</span>,
                <span key="reason" className="text-brand-muted">{allocation?.reason ?? 'Performance-weighted'}</span>,
              ];
            })}
          />
        </SectionCard>
      </section>

      {/* ── Validation gates ── */}
      <section id="validation" className="scroll-mt-24 mt-5">
        <SectionCard title="Validation gates" description="Businesses without complete data remain capped until IC review clears them.">
          <DataTable
            headers={['Business', 'Gate', 'Data', 'Suggested state']}
            rows={scores.map((score) => [
              <span key="engine" className="font-medium">{score.engine.code}</span>,
              <StatusBadge key="gate" state={score.engine.validationGate ? 'WATCH' : 'GREEN'}>{score.engine.validationGate ? 'CAPPED' : 'OPEN'}</StatusBadge>,
              <StatusBadge key="data" state={score.insufficientData ? 'WATCH' : 'GREEN'}>{score.insufficientData ? 'TBC' : 'COMPLETE'}</StatusBadge>,
              <span key="state" className="text-brand-muted">{score.engine.validationGate || score.insufficientData ? 'Maintain cap' : 'Eligible for weighted allocation'}</span>,
            ])}
          />
        </SectionCard>
      </section>

      {/* ── Performance inputs ── */}
      <section id="performance" className="scroll-mt-24 mt-5">
        <SectionCard title="Performance inputs" description="Values are normalized on a 0-1 scale before scoring. TBC values prevent full performance weighting.">
          <DataTable
            headers={['Business', 'ROIC', 'Cash conv.', 'Sell-through', 'Repeat demand', 'Op. risk']}
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
      </section>
    </>
  );
}
