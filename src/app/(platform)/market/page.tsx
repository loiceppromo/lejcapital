import type { Metadata } from 'next';
import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { MarketHoldingForm } from '@/components/app/market-holding-form';
import { MarketPolicyForm } from '@/components/app/market-policy-form';
import { PageHeader } from '@/components/app/page-header';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { getMarketHoldings, getMarketPolicy, money, pct } from '@/lib/platform/selectors';
import { guardPage } from '@/lib/auth/page-guard';
import { canAccess } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Market Portfolio | LEJ Capital' };

export default async function MarketPage() {
  const { role } = await guardPage('/market');
  const state = await loadPlatformState();
  const policy = getMarketPolicy(state);
  const holdings = getMarketHoldings(state);
  const gseHoldings = holdings.filter((holding) => holding.instrumentType === 'GSE_EQUITY');
  const tbillHoldings = holdings.filter((holding) => holding.instrumentType === 'TBILL');
  const cashHoldings = holdings.filter((holding) => holding.instrumentType === 'CASH');
  const triggerRecord = state.opportunisticTriggers.find((trigger) => trigger.cycleId === state.activeCycleId);
  const cycleOptions = state.cycles.map((cycle) => ({
    id: cycle.id,
    label: `Cycle ${cycle.sequenceNo} · ${cycle.status}`,
  }));

  return (
    <>
      <PrintHeader title="Market Portfolio" subtitle={`Regime: ${policy.effectiveRegime} · ${holdings.length} holdings`} />
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Market' }]}
        title="Market portfolio"
        description="Regime-based GSE, T-Bill, and cash management with exposure and drawdown controls."
        action={
          <div className="flex gap-2">
            <PresentationToggle />
            {canAccess(role, 'ADD_HOLDING') && (
              <>
                <ActionDrawer label="Market policy" title="Market regime policy"><MarketPolicyForm cycles={cycleOptions} /></ActionDrawer>
                <ActionDrawer label="Add holding" title="Add market holding"><MarketHoldingForm cycles={cycleOptions} /></ActionDrawer>
              </>
            )}
          </div>
        }
      />
      <div className="kpi-scroll-row grid gap-4 md:grid-cols-4">
        <KpiCard label="Effective regime" value={policy.effectiveRegime} state={policy.regimeWasDowngraded ? 'WATCH' : 'GREEN'} />
        <KpiCard label="GSE exposure" value={pct(policy.gseExposure.currentPct)} state={policy.gseExposure.withinLimit ? 'GREEN' : 'BREACH'} />
        <KpiCard label="Drawdown" value={pct(policy.drawdown.drawdownPct)} state={policy.drawdown.status === 'NORMAL' ? 'GREEN' : policy.drawdown.status === 'FLAG' ? 'WATCH' : 'BREACH'} />
        <KpiCard label="GSE ceiling" value={money(policy.gseExposure.ceiling)} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Regime controls" description="Regime stance and automatic controls from drawdown and exposure rules.">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard label="GSE names" value={String(gseHoldings.length)} state={policy.minNamesSatisfied ? 'GREEN' : 'BREACH'} />
            <KpiCard label="T-Bills" value={String(tbillHoldings.length)} />
            <KpiCard label="Cash lines" value={String(cashHoldings.length)} />
            <KpiCard label="Downgrade" value={policy.regimeWasDowngraded ? 'Active' : 'None'} state={policy.regimeWasDowngraded ? 'WATCH' : 'GREEN'} />
            <KpiCard label="Requested" value={policy.requestedRegime} />
            <KpiCard label="UNDC gate" value={triggerRecord?.undcDemandValidated ? 'Met' : 'TBC'} state={triggerRecord?.undcDemandValidated ? 'GREEN' : 'WATCH'} />
            <KpiCard label="Catalyst" value={triggerRecord?.marketCatalystDocumented ? 'Met' : 'TBC'} state={triggerRecord?.marketCatalystDocumented ? 'GREEN' : 'WATCH'} />
            <KpiCard label="Ops issues" value={triggerRecord?.noOpenOperationalIssues ? 'Clear' : 'TBC'} state={triggerRecord?.noOpenOperationalIssues ? 'GREEN' : 'WATCH'} />
          </div>
        </SectionCard>

        <SectionCard title="Holdings" description="Manual holdings register for GSE equities, T-Bills, and cash.">
          <DataTable
            headers={['Instrument', 'Name', 'Invested', 'Current', 'Return', 'Maturity']}
            rows={holdings.map((holding) => [
              <StatusBadge key="type" state={holding.instrumentType === 'GSE_EQUITY' ? 'WATCH' : holding.instrumentType === 'TBILL' ? 'GREEN' : 'NEUTRAL'}>{holding.instrumentType.replaceAll('_', ' ')}</StatusBadge>,
              <span key="name" className="font-medium">{holding.name}</span>,
              <span key="invested" className="font-mono">{money(holding.amountInvested)}</span>,
              <span key="current" className="font-mono font-semibold">{money(holding.currentValue)}</span>,
              <span key="return" className="font-mono">{pct(holding.returnRate)}</span>,
              <span key="maturity" className="text-brand-muted">{holding.maturityDate ?? 'TBC'}</span>,
            ])}
          />
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard title="Policy alerts">
          <div className="space-y-2">
            {policy.actions.length === 0 ? (
              <div className="rounded-md border border-brand-line bg-brand-panel px-3 py-3 text-sm text-brand-muted">
                No market policy breaches.
              </div>
            ) : (
              policy.actions.map((action) => (
                <div key={action} className="rounded-md border border-brand-line bg-brand-panel px-3 py-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#80611a]" />
                    <span>{action}</span>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2">
              <StatusBadge state={policy.minNamesSatisfied ? 'GREEN' : 'BREACH'}>
                Min-name diversification {policy.minNamesSatisfied ? 'met' : 'breach'}
              </StatusBadge>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
