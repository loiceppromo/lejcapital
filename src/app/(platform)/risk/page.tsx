import type { Metadata } from 'next';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { guardPage } from '@/lib/auth/page-guard';
import {
  getOverview,
  getRiskItems,
  getStressResults,
  money,
  pct,
  ratio,
} from '@/lib/platform/selectors';

export const metadata: Metadata = { title: 'Risk | LEJ Capital' };

export default async function RiskPage() {
  await guardPage('/risk');
  const state = await loadPlatformState();
  const overview = getOverview(state);
  const riskItems = getRiskItems(state);
  const stressResults = getStressResults(state);
  const breaches = riskItems.filter((item) => item.state === 'BREACH');
  const watches = riskItems.filter((item) => item.state === 'WATCH');

  return (
    <>
      <PageHeader
        title="Risk dashboard"
        description="Consolidated risk posture: PCR status, market exposure, loan quality, engine performance, and stress scenarios."
      />

      {/* Top-line risk KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="PCR"
          value={ratio(overview.pcr.pcr)}
          detail={overview.pcr.status}
          state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}
        />
        <KpiCard
          label="NAV vs principal"
          value={money(overview.currentNAV)}
          detail={`Principal: ${money(overview.investorPrincipalDue)}`}
          state={overview.currentNAV.gte(overview.investorPrincipalDue) ? 'GREEN' : 'BREACH'}
        />
        <KpiCard
          label="Breaches"
          value={String(breaches.length)}
          state={breaches.length > 0 ? 'BREACH' : 'GREEN'}
        />
        <KpiCard
          label="Watch items"
          value={String(watches.length)}
          state={watches.length > 0 ? 'WATCH' : 'GREEN'}
        />
        <KpiCard
          label="Loan PAR > 30"
          value={pct(overview.loanMetrics.par30)}
          state={overview.loanMetrics.par30.lte('0.05') ? 'GREEN' : overview.loanMetrics.par30.lte('0.15') ? 'WATCH' : 'BREACH'}
        />
      </div>

      {/* Risk register */}
      <div className="mt-5">
        <SectionCard title="Risk register" description="All monitored metrics with current status and suggested action.">
          <DataTable
            headers={['Metric', 'Value', 'Status', 'Suggested action']}
            rows={riskItems.map((item) => [
              <span key="label" className="font-medium">{item.label}</span>,
              item.value,
              <StatusBadge key="status" state={item.state}>{item.state}</StatusBadge>,
              <span key="action" className="text-brand-muted">{item.action}</span>,
            ])}
          />
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* PCR breakdown */}
        <SectionCard title="PCR breakdown" description="Liquid assets / investor principal due.">
          <DataTable
            headers={['Component', 'Amount']}
            rows={[
              ['Protection sleeve', money(overview.pcr.liquidAssets)],
              ['Investor principal due', money(overview.investorPrincipalDue)],
              [<span key="pcr" className="font-semibold">PCR ratio</span>, <span key="val" className="font-semibold">{ratio(overview.pcr.pcr)}</span>],
            ]}
          />
          {overview.pcrActions && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Mandated actions ({overview.pcr.status})</p>
              {overview.pcrActions.actions.map((action) => (
                <div key={action} className="rounded border border-brand-silver bg-brand-surface px-3 py-1.5 text-sm">
                  {action}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Market exposure */}
        <SectionCard title="Market exposure" description="GSE, T-Bill, and cash within regime limits.">
          <DataTable
            headers={['Check', 'Value', 'Status']}
            rows={[
              [
                'GSE exposure',
                pct(overview.marketPolicy.gseExposure.currentPct),
                <StatusBadge key="s" state={overview.marketPolicy.gseExposure.withinLimit ? 'GREEN' : 'BREACH'}>{overview.marketPolicy.gseExposure.withinLimit ? 'Within limit' : 'BREACH'}</StatusBadge>,
              ],
              [
                'Drawdown',
                pct(overview.marketPolicy.drawdown.drawdownPct),
                <StatusBadge key="s" state={overview.marketPolicy.drawdown.status === 'NORMAL' ? 'GREEN' : overview.marketPolicy.drawdown.status === 'FLAG' ? 'WATCH' : 'BREACH'}>{overview.marketPolicy.drawdown.status}</StatusBadge>,
              ],
              [
                'Min-name diversification',
                overview.marketPolicy.minNamesSatisfied ? 'Satisfied' : 'Not satisfied',
                <StatusBadge key="s" state={overview.marketPolicy.minNamesSatisfied ? 'GREEN' : 'BREACH'}>{overview.marketPolicy.minNamesSatisfied ? 'OK' : 'BREACH'}</StatusBadge>,
              ],
              [
                'Effective regime',
                overview.marketPolicy.effectiveRegime,
                <StatusBadge key="s" state={overview.marketPolicy.regimeWasDowngraded ? 'WATCH' : 'GREEN'}>{overview.marketPolicy.regimeWasDowngraded ? 'Downgraded' : 'Confirmed'}</StatusBadge>,
              ],
            ]}
          />
        </SectionCard>
      </div>

      {/* Stress scenarios */}
      <div className="mt-5">
        <SectionCard title="Stress scenarios" description="Hypothetical shocks. Target: PCR >= 1.00x under all scenarios.">
          <DataTable
            headers={['Scenario', 'Stressed PCR', 'Principal covered', 'NAV impact', 'Assessment']}
            rows={stressResults.map((result) => [
              <span key="label" className="font-medium">{result.label}</span>,
              ratio(result.pcr),
              result.principalCovered
                ? <StatusBadge key="s" state="GREEN">Covered</StatusBadge>
                : <StatusBadge key="s" state="BREACH">Not covered</StatusBadge>,
              money(result.navImpact),
              <span key="assessment" className="text-brand-muted">
                {result.pcr.gte('1.25') ? 'Comfortable' : result.pcr.gte('1.0') ? 'Adequate' : 'Action required'}
              </span>,
            ])}
          />
        </SectionCard>
      </div>

      {/* Action items */}
      <div className="mt-5">
        <SectionCard title="Required actions" description="Items derived from breaches and watch conditions.">
          <div className="space-y-2">
            {overview.actionRequired.length === 0 ? (
              <p className="text-sm text-brand-muted">No breaches or watch conditions. All controls green.</p>
            ) : (
              overview.actionRequired.map((action) => (
                <div key={action} className="rounded-md border border-brand-silver bg-brand-surface px-3 py-2 text-sm">
                  {action}
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
