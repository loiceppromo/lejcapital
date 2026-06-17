import type { Metadata } from 'next';
import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { MissingDataForm } from '@/components/app/missing-data-form';
import { PageHeader } from '@/components/app/page-header';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { AuditTableClient } from '@/components/app/audit-table-client';
import { loadPlatformState } from '@/lib/data/queries';
import { getMissingData } from '@/lib/platform/selectors';
import { guardPage } from '@/lib/auth/page-guard';
import { canAccess } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Audit | LEJ Capital' };

export default async function AuditPage() {
  const { role } = await guardPage('/audit');
  const state = await loadPlatformState();
  const missing = getMissingData(state);
  const blocking = missing.filter((item) => item.blocking);

  return (
    <>
      <PrintHeader title="Audit Trail" subtitle={`${state.auditEntries.length} entries · ${missing.length} missing-data items`} />
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit' }]}
        title="Audit"
        description="Immutable action trail, missing-data register, and reporting blockers."
        action={
          <div className="flex gap-2">
            <PresentationToggle />
            {canAccess(role, 'RESOLVE_MISSING_DATA') ? <ActionDrawer label="Resolve missing data" title="Resolve missing-data item"><MissingDataForm items={missing} /></ActionDrawer> : null}
          </div>
        }
      />
      <div className="kpi-scroll-row grid gap-4 md:grid-cols-3">
        <KpiCard label="Audit entries" value={String(state.auditEntries.length)} />
        <KpiCard label="Missing data" value={String(missing.length)} state={missing.length > 0 ? 'WATCH' : 'GREEN'} />
        <KpiCard label="Blocking items" value={String(blocking.length)} state={blocking.length > 0 ? 'BREACH' : 'GREEN'} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Audit log browser" description="Immutable action trail with search and filter. Corrections are recorded as new actions, not silent edits.">
          <AuditTableClient entries={state.auditEntries} />
        </SectionCard>
        <SectionCard title="Missing-data register" description="TBC items that affect reporting readiness.">
          <DataTable
            headers={['Entity', 'Field', 'Blocking']}
            rows={missing.map((item) => [
              <span key="entity" className="font-medium">{item.entity}</span>,
              item.field,
              <StatusBadge key="blocking" state={item.blocking ? 'BREACH' : 'WATCH'}>{item.blocking ? 'Yes' : 'Watch'}</StatusBadge>,
            ])}
          />
        </SectionCard>
      </div>

      {/* Audit data export for AI-powered auditing */}
      <div className="mt-5">
        <SectionCard
          title="Audit data export"
          description="Download all system data for external AI-powered auditing after each cycle. The audit pack contains every transaction, cash movement, and operational record."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/api/export/audit-pack"
              download
              className="flex flex-col items-center gap-2 rounded-lg border border-brand-line bg-brand-panel p-4 text-center transition-colors hover:border-brand-navy hover:bg-brand-navy/5"
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand-navy" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
              <span className="text-sm font-semibold text-brand-navy">Full audit pack</span>
              <span className="text-[10px] text-brand-muted">All data in one CSV</span>
            </a>
            <a
              href="/api/export/ledger"
              download
              className="flex flex-col items-center gap-2 rounded-lg border border-brand-line bg-brand-panel p-4 text-center transition-colors hover:border-brand-navy hover:bg-brand-navy/5"
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand-navy" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
              <span className="text-sm font-semibold text-brand-navy">Ledger entries</span>
              <span className="text-[10px] text-brand-muted">All cash in/out</span>
            </a>
            <a
              href="/api/export/loans"
              download
              className="flex flex-col items-center gap-2 rounded-lg border border-brand-line bg-brand-panel p-4 text-center transition-colors hover:border-brand-navy hover:bg-brand-navy/5"
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand-navy" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              <span className="text-sm font-semibold text-brand-navy">Loan book</span>
              <span className="text-[10px] text-brand-muted">Loans & schedule</span>
            </a>
            <a
              href="/api/export/audit"
              download
              className="flex flex-col items-center gap-2 rounded-lg border border-brand-line bg-brand-panel p-4 text-center transition-colors hover:border-brand-navy hover:bg-brand-navy/5"
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand-navy" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              <span className="text-sm font-semibold text-brand-navy">Audit trail</span>
              <span className="text-[10px] text-brand-muted">All system actions</span>
            </a>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a href="/api/export/portfolio" download className="rounded-md border border-brand-line bg-white px-3 py-2 text-center text-xs font-semibold text-brand-black hover:bg-brand-panel">Market portfolio</a>
            <a href="/api/export/market-trades" download className="rounded-md border border-brand-line bg-white px-3 py-2 text-center text-xs font-semibold text-brand-black hover:bg-brand-panel">Market trades</a>
            <a href="/api/export/investors" download className="rounded-md border border-brand-line bg-white px-3 py-2 text-center text-xs font-semibold text-brand-black hover:bg-brand-panel">Capital partners</a>
            <a href="/api/export/contributions" download className="rounded-md border border-brand-line bg-white px-3 py-2 text-center text-xs font-semibold text-brand-black hover:bg-brand-panel">Contributions</a>
            <a href="/api/export/borrowers" download className="rounded-md border border-brand-line bg-white px-3 py-2 text-center text-xs font-semibold text-brand-black hover:bg-brand-panel">Borrowers</a>
            <a href="/api/export/engines" download className="rounded-md border border-brand-line bg-white px-3 py-2 text-center text-xs font-semibold text-brand-black hover:bg-brand-panel">Businesses</a>
            <a href="/api/export/cycles" download className="rounded-md border border-brand-line bg-white px-3 py-2 text-center text-xs font-semibold text-brand-black hover:bg-brand-panel">Cycles</a>
            <a href="/api/export/loan-schedule" download className="rounded-md border border-brand-line bg-white px-3 py-2 text-center text-xs font-semibold text-brand-black hover:bg-brand-panel">Loan schedule</a>
            <a href="/api/export/dashboard-snapshot" download className="rounded-md border border-brand-line bg-white px-3 py-2 text-center text-xs font-semibold text-brand-black hover:bg-brand-panel">Dashboard snapshot</a>
          </div>
          <p className="mt-3 rounded-md border border-brand-line bg-brand-panel px-3 py-2 text-xs text-brand-muted">
            <strong>AI audit tip:</strong> Download the &quot;Full audit pack&quot; after each cycle closes. Upload it to your AI assistant for a comprehensive review of all transactions, cash flows, provisions, and risk controls.
          </p>
        </SectionCard>
      </div>
    </>
  );
}
