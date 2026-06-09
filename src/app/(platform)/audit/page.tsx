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

  return (
    <>
      <PageHeader
        title="Audit"
        description="Immutable action trail, missing-data register, and investor-ready blockers."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Audit entries" value={String(state.auditEntries.length)} />
        <KpiCard label="Missing data" value={String(missing.length)} state={missing.length > 0 ? 'WATCH' : 'GREEN'} />
        <KpiCard label="Blocking items" value={String(missing.filter((item) => item.blocking).length)} state={missing.some((item) => item.blocking) ? 'BREACH' : 'GREEN'} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Audit log browser" description="Filter by actor/entity/date/action after persistence is connected.">
          <DataTable
            headers={['Time', 'Actor', 'Action', 'Entity', 'After']}
            rows={state.auditEntries.map((entry) => [
              entry.createdAt.slice(0, 19),
              entry.actorId,
              <span key="action" className="font-medium">{entry.action}</span>,
              `${entry.entityType} · ${entry.entityId}`,
              <span key="after" className="text-brand-muted">{entry.after}</span>,
            ])}
          />
        </SectionCard>
        <SectionCard title="Missing-data register">
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
