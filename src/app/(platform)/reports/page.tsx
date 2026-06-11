import type { Metadata } from 'next';
import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { ICDecisionForm } from '@/components/app/ic-decision-form';
import { Icon } from '@/components/app/icon';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { PageNav } from '@/components/app/page-nav';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { SnapshotForm } from '@/components/app/snapshot-form';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { getCurrentUser } from '@/lib/auth/server';
import { canAccess } from '@/lib/auth/roles';
import { getOverview, getStressResults, money, ratio } from '@/lib/platform/selectors';

const reportPacks = [
  {
    name: 'AI audit pack',
    description: 'Complete system export: cycles, sleeves, ledger, loans, market, stress, audit',
    slug: 'audit-pack',
  },
  {
    name: 'Dashboard snapshot',
    description: 'KPIs, NAV, PCR, stress matrix',
    slug: 'dashboard-snapshot',
  },
  {
    name: 'Market portfolio',
    description: 'All GSE equities, T-Bills, cash holdings',
    slug: 'portfolio',
  },
  {
    name: 'Loan book',
    description: 'Active loans, principal, rates, provisions',
    slug: 'loans',
  },
  {
    name: 'Loan schedule',
    description: 'Full amortisation schedule with payment status',
    slug: 'loan-schedule',
  },
  {
    name: 'Borrower register',
    description: 'KYC status, risk grades, contacts',
    slug: 'borrowers',
  },
  {
    name: 'Investor register',
    description: 'All investors and contact details',
    slug: 'investors',
  },
  {
    name: 'Contributions',
    description: 'Capital contributions by investor and cycle',
    slug: 'contributions',
  },
  {
    name: 'Cycle history',
    description: 'All cycles, NAV opening/closing, status',
    slug: 'cycles',
  },
  {
    name: 'Operating engines',
    description: 'Engine records, ROIC, Brand Score inputs',
    slug: 'engines',
  },
  {
    name: 'Ledger',
    description: 'Complete append-only cash movement register',
    slug: 'ledger',
  },
  {
    name: 'Audit trail',
    description: 'Recent 100 audit entries with actor and action',
    slug: 'audit',
  },
] as const;

function DownloadButton({ slug }: { slug: string }) {
  return (
    <a
      href={`/api/export/${slug}`}
      download
      className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy-dark"
    >
      <Icon name="download" className="h-3.5 w-3.5" />
      CSV
    </a>
  );
}

function PdfButton() {
  return (
    <a
      href="/api/export/dashboard-snapshot-pdf"
      download
      className="inline-flex items-center gap-1.5 rounded-md border border-brand-line bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-black hover:bg-brand-panel"
    >
      PDF
    </a>
  );
}

export const metadata: Metadata = { title: 'Reports | LEJ Capital' };

export default async function ReportsPage() {
  const state = await loadPlatformState();
  const user = await getCurrentUser();
  const overview = getOverview(state);
  const stressResults = getStressResults(state);
  const cycleOptions = state.cycles.map((cycle) => ({
    id: cycle.id,
    label: `Cycle ${cycle.sequenceNo} · ${cycle.status}`,
  }));
  const canCapture = canAccess(user.role, 'CAPTURE_SNAPSHOT');
  const canRecordIC = canAccess(user.role, 'RECORD_IC_DECISION');

  return (
    <>
      <PrintHeader title="Reports" subtitle={`NAV ${money(overview.currentNAV)} · PCR ${ratio(overview.pcr.pcr)}`} />
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]}
        title="Reports"
        description="Export fund data as CSV. Click any download button for an instant spreadsheet."
        action={
          <div className="flex gap-2">
            <PresentationToggle />
            {canCapture && <ActionDrawer label="Capture snapshot" title="Monthly dashboard snapshot"><SnapshotForm /></ActionDrawer>}
            {canRecordIC && <ActionDrawer label="Record IC decision" title="Investment Committee decision"><ICDecisionForm cycles={cycleOptions} /></ActionDrawer>}
          </div>
        }
      />
      <PageNav items={[
        { id: 'overview', label: 'Overview' },
        { id: 'exports', label: 'Exports' },
        { id: 'stress', label: 'Stress' },
        { id: 'snapshots', label: 'Snapshots' },
        { id: 'ic', label: 'IC Decisions' },
      ]} />

      <section id="overview" className="scroll-mt-24">
        <div className="kpi-scroll-row grid gap-4 md:grid-cols-3">
          <KpiCard label="Current NAV" value={money(overview.currentNAV)} />
          <KpiCard label="PCR" value={ratio(overview.pcr.pcr)} state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'} />
          <KpiCard
            label="Cycle"
            value={`Cycle ${overview.activeCycle.sequenceNo}`}
            detail={overview.activeCycle.status}
          />
        </div>
      </section>

      <section id="exports" className="scroll-mt-24 mt-5">
        <SectionCard
          title="Available exports"
          description="One-click CSV downloads from live data. Exports are generated from current persisted records."
        >
          <DataTable
            headers={['Report', 'Description', '']}
            rows={reportPacks.map((rp) => [
              <span key="name" className="font-medium">{rp.name}</span>,
              <span key="desc" className="text-brand-muted">{rp.description}</span>,
              <span key="dl" className="flex gap-2">
                <DownloadButton slug={rp.slug} />
                {rp.slug === 'dashboard-snapshot' ? <PdfButton /> : null}
              </span>,
            ])}
          />
        </SectionCard>
      </section>

      <section id="stress" className="scroll-mt-24 mt-5">
        <SectionCard
          title="Stress matrix"
          description="Scenarios, not forecasts. Principal coverage target is PCR >= 1.00x."
          action={<DownloadButton slug="dashboard-snapshot" />}
        >
          <DataTable
            headers={['Scenario', 'PCR', 'Covered', 'NAV impact']}
            rows={stressResults.map((result) => [
              <span key="scenario" className="font-medium">{result.label}</span>,
              <span key="pcr" className="font-mono">{ratio(result.pcr)}</span>,
              result.principalCovered ? (
                <StatusBadge key="cov" state="GREEN">Covered</StatusBadge>
              ) : (
                <StatusBadge key="cov" state="BREACH">Not covered</StatusBadge>
              ),
              <span key="impact" className="font-mono">{money(result.navImpact)}</span>,
            ])}
          />
        </SectionCard>
      </section>

      <section id="snapshots" className="scroll-mt-24 mt-5">
        <SectionCard title="Monthly snapshots" description="Frozen dashboard KPI captures for reporting and review.">
          <DataTable
            headers={['Date', 'Captured', 'Cycle', 'NAV', 'PCR', 'Risk breaches']}
            rows={state.reportSnapshots.map((snapshot) => [
              <span key="date" className="font-mono text-xs">{snapshot.snapshotDate}</span>,
              <span key="created" className="font-mono text-xs text-brand-muted">{snapshot.createdAt.slice(0, 19)}</span>,
              `${snapshot.activeCycle} · ${snapshot.cycleStatus}`,
              <span key="nav" className="font-mono">GHS {Number(snapshot.currentNAV).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
              <span key="pcr" className="font-mono">{Number(snapshot.pcr).toFixed(2)}x</span>,
              <StatusBadge key="risk" state={snapshot.riskBreaches > 0 ? 'BREACH' : 'GREEN'}>{snapshot.riskBreaches}</StatusBadge>,
            ])}
          />
        </SectionCard>
      </section>

      <section id="ic" className="scroll-mt-24 mt-5">
        <SectionCard title="Recent IC decisions" description="Recorded increase, maintain, reduce, and exit decisions with rationale.">
          <DataTable
            headers={['Time', 'Cycle', 'Position', 'Decision', 'Rationale']}
            rows={state.icDecisions.map((decision) => {
              const cycle = state.cycles.find((item) => item.id === decision.cycleId);
              return [
                <span key="time" className="font-mono text-xs">{decision.createdAt.slice(0, 10)}</span>,
                cycle ? `Cycle ${cycle.sequenceNo}` : 'TBC',
                <span key="position" className="font-medium">{decision.position}</span>,
                <StatusBadge key="decision" state={decision.decision === 'INCREASE' ? 'GREEN' : decision.decision === 'MAINTAIN' ? 'NEUTRAL' : 'WATCH'}>{decision.decision}</StatusBadge>,
                <span key="rationale" className="text-brand-muted">{decision.rationale}</span>,
              ];
            })}
          />
        </SectionCard>
      </section>
    </>
  );
}
