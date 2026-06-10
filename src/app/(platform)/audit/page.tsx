import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { getMissingData } from '@/lib/platform/selectors';

export default async function AuditPage() {
  const state = await loadPlatformState();
  const missing = getMissingData(state);
  const blocking = missing.filter((item) => item.blocking);

  return (
    <>
      <PageHeader
        title="Audit"
        description="Immutable action trail, missing-data register, and investor-ready blockers."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Audit entries" value={String(state.auditEntries.length)} />
        <KpiCard label="Missing data" value={String(missing.length)} state={missing.length > 0 ? 'WATCH' : 'GREEN'} />
        <KpiCard label="Blocking items" value={String(blocking.length)} state={blocking.length > 0 ? 'BREACH' : 'GREEN'} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Audit log browser" description="Immutable action trail. Corrections are recorded as new actions, not silent edits.">
          <DataTable
            headers={['Time', 'Actor', 'Action', 'Entity', 'After']}
            rows={state.auditEntries.map((entry) => [
              <span key="time" className="font-mono text-xs">{entry.createdAt.slice(0, 19)}</span>,
              <span key="actor" className="font-mono text-xs text-brand-muted">{entry.actorId}</span>,
              <span key="action" className="font-medium">{entry.action}</span>,
              <span key="entity" className="text-brand-muted">{entry.entityType} · {entry.entityId}</span>,
              <span key="after" className="block max-w-xl truncate font-mono text-xs text-brand-muted">{entry.after}</span>,
            ])}
          />
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
