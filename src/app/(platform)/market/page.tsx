import type { Metadata } from 'next';
import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { MarketHoldingForm } from '@/components/app/market-holding-form';
import { MarketDataPanel } from '@/components/app/market-ticker';
import { MarketPolicyForm } from '@/components/app/market-policy-form';
import { MarketTradeForm } from '@/components/app/market-trade-form';
import { PageHeader } from '@/components/app/page-header';
import { PageNav } from '@/components/app/page-nav';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { ExchangeRateCard } from '@/components/app/exchange-rate-card';
import { loadPlatformState } from '@/lib/data/queries';
import { getMarketHoldings, getMarketPolicy, money, pct } from '@/lib/platform/selectors';
import { hasPersistedCycles, toCycleOptions } from '@/lib/platform/cycle-utils';
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
  const trades = state.marketTrades.filter((trade) => trade.cycleId === state.activeCycleId);
  const triggerRecord = state.opportunisticTriggers.find((trigger) => trigger.cycleId === state.activeCycleId);
  const cycleOptions = toCycleOptions(state);
  const hasCycles = hasPersistedCycles(state);

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
            {canAccess(role, 'ADD_HOLDING') && hasCycles && (
              <>
                <ActionDrawer label="Market policy" title="Market regime policy"><MarketPolicyForm cycles={cycleOptions} /></ActionDrawer>
                <ActionDrawer label="Record trade" title="Market trade ticket">
                  <MarketTradeForm
                    cycles={cycleOptions}
                    holdings={state.marketHoldings.map((holding) => ({
                      id: holding.id,
                      cycleId: holding.cycleId,
                      instrumentType: holding.instrumentType,
                      name: holding.name,
                      currentValue: money(holding.currentValue),
                    }))}
                  />
                </ActionDrawer>
                <ActionDrawer label="Add holding" title="Add market holding"><MarketHoldingForm cycles={cycleOptions} /></ActionDrawer>
              </>
            )}
          </div>
        }
      />
      <PageNav items={[
        { id: 'overview', label: 'Overview' },
        { id: 'live-data', label: 'Live Data' },
        { id: 'fx-rates', label: 'FX Rates' },
        { id: 'regime', label: 'Regime' },
        { id: 'holdings', label: 'Holdings' },
        { id: 'trades', label: 'Trades' },
        { id: 'alerts', label: 'Alerts' },
      ]} />

      {!hasCycles && (
        <section className="mb-5">
          <SectionCard title="Create Cycle 1 first" description="Market policy, holdings, and trade tickets require a real persisted cycle. The current zero cycle is only a safe dashboard placeholder.">
            <a href="/cycles" className="inline-flex rounded-md bg-brand-navy px-3 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark">
              Open cycle setup
            </a>
          </SectionCard>
        </section>
      )}

      <section id="overview" className="scroll-mt-24">
        <div className="kpi-scroll-row grid gap-4 md:grid-cols-4">
          <KpiCard label="Effective regime" value={policy.effectiveRegime} state={policy.regimeWasDowngraded ? 'WATCH' : 'GREEN'} />
          <KpiCard label="GSE exposure" value={pct(policy.gseExposure.currentPct)} state={policy.gseExposure.withinLimit ? 'GREEN' : 'BREACH'} />
          <KpiCard label="Drawdown" value={pct(policy.drawdown.drawdownPct)} state={policy.drawdown.status === 'NORMAL' ? 'GREEN' : policy.drawdown.status === 'FLAG' ? 'WATCH' : 'BREACH'} />
          <KpiCard label="GSE ceiling" value={money(policy.gseExposure.ceiling)} amount={policy.gseExposure.ceiling.toNumber()} />
        </div>
      </section>

      <section id="live-data" className="scroll-mt-24 mt-5">
        <SectionCard title="Real-time market data" description="Live GSE equity prices, T-Bill rates, and market indices. Auto-refreshes every 60 seconds.">
          <MarketDataPanel />
        </SectionCard>
      </section>

      <section id="fx-rates" className="scroll-mt-24 mt-5">
        <SectionCard title="Foreign exchange rates" description="GHS against major international currencies. Used for multi-currency display toggle.">
          <ExchangeRateCard />
        </SectionCard>
      </section>

      <section id="regime" className="scroll-mt-24 mt-5">
        <SectionCard title="Regime controls" description="Regime stance and automatic controls from drawdown and exposure rules.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>

      <section id="holdings" className="scroll-mt-24 mt-5">
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
      </section>

      <section id="trades" className="scroll-mt-24 mt-5">
        <SectionCard title="Trade blotter" description="Immutable market execution journal. Each trade updates holdings, ledger, and audit history.">
          <DataTable
            headers={['Date', 'Side', 'Instrument', 'Name', 'Gross', 'Fees', 'Net', 'Venue']}
            rows={trades.map((trade) => [
              <span key="date" className="font-mono text-brand-muted">{trade.tradeDate}</span>,
              <StatusBadge key="side" state={trade.side === 'BUY' ? 'WATCH' : 'GREEN'}>{trade.side}</StatusBadge>,
              <span key="instrument" className="text-xs">{trade.instrumentType.replaceAll('_', ' ')}</span>,
              <span key="name" className="font-medium">{trade.name}</span>,
              <span key="gross" className="font-mono">{money(trade.grossAmount)}</span>,
              <span key="fees" className="font-mono text-brand-muted">{money(trade.fees)}</span>,
              <span key="net" className="font-mono font-semibold">{money(trade.netAmount)}</span>,
              <span key="venue" className="text-brand-muted">{trade.executionVenue ?? 'TBC'}</span>,
            ])}
          />
        </SectionCard>
      </section>

      <section id="alerts" className="scroll-mt-24 mt-5">
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
      </section>
    </>
  );
}
