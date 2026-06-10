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
        description="Immutable action trail, missing-data register, and investor-ready blockers."
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
        <SectionCard title="Missing-data register" description="TBC items that affect investor-ready reporting.">
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
    </>
  );
}
