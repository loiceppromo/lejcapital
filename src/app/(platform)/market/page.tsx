import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { MarketHoldingForm } from '@/components/app/market-holding-form';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { getMarketHoldings, getMarketPolicy, money, pct } from '@/lib/platform/selectors';

export default async function MarketPage() {
  const state = await loadPlatformState();
  const policy = getMarketPolicy(state);
  const holdings = getMarketHoldings(state);

  return (
    <>
      <PageHeader
        title="Market portfolio"
        description="Regime-based GSE, T-Bill, and cash management with exposure and drawdown controls."
        action={<ActionDrawer label="Add holding" title="Add market holding"><MarketHoldingForm /></ActionDrawer>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Effective regime" value={policy.effectiveRegime} state={policy.regimeWasDowngraded ? 'WATCH' : 'GREEN'} />
        <KpiCard label="GSE exposure" value={pct(policy.gseExposure.currentPct)} state={policy.gseExposure.withinLimit ? 'GREEN' : 'BREACH'} />
        <KpiCard label="Drawdown" value={pct(policy.drawdown.drawdownPct)} state={policy.drawdown.status === 'NORMAL' ? 'GREEN' : policy.drawdown.status === 'FLAG' ? 'WATCH' : 'BREACH'} />
        <KpiCard label="GSE ceiling" value={money(policy.gseExposure.ceiling)} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <SectionCard title="Holdings">
          <DataTable
            headers={['Instrument', 'Name', 'Invested', 'Current', 'Return', 'Maturity']}
            rows={holdings.map((holding) => [
              holding.instrumentType.replaceAll('_', ' '),
              <span key="name" className="font-medium">{holding.name}</span>,
              money(holding.amountInvested),
              money(holding.currentValue),
              pct(holding.returnRate),
              holding.maturityDate ?? 'TBC',
            ])}
          />
        </SectionCard>
        <SectionCard title="Policy alerts">
          <div className="space-y-2">
            {policy.actions.length === 0 ? (
              <p className="text-sm text-brand-muted">No market policy breaches.</p>
            ) : (
              policy.actions.map((action) => (
                <div key={action} className="rounded-md border border-brand-silver bg-brand-surface px-3 py-2 text-sm">
                  {action}
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
