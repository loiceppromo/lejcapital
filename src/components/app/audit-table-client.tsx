'use client';

import { useState, useMemo } from 'react';
import { DataTable } from './data-table';
import { StatusBadge } from './status-badge';
import { AuditFilters, type AuditFilterState } from './audit-filters';

interface AuditRow {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  after: string;
  createdAt: string;
}

export function AuditTableClient({ entries }: { entries: AuditRow[] }) {
  const [filters, setFilters] = useState<AuditFilterState>({
    action: '',
    entityType: '',
    search: '',
  });

  const actions = useMemo(() => [...new Set(entries.map((e) => e.action))].sort(), [entries]);
  const entityTypes = useMemo(() => [...new Set(entries.map((e) => e.entityType))].sort(), [entries]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (filters.action && entry.action !== filters.action) return false;
      if (filters.entityType && entry.entityType !== filters.entityType) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = `${entry.actorId} ${entry.action} ${entry.entityType} ${entry.entityId} ${entry.after}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [entries, filters]);

  return (
    <div className="space-y-4">
      <AuditFilters
        filters={filters}
        onChange={setFilters}
        actions={actions}
        entityTypes={entityTypes}
      />
      <div className="text-xs text-brand-muted">
        Showing {filtered.length} of {entries.length} entries
      </div>
      <DataTable
        headers={['Time', 'Actor', 'Action', 'Entity', 'After']}
        maxHeight="max-h-[500px]"
        rows={filtered.map((entry) => [
          <span key="time" className="font-mono text-xs">{entry.createdAt.slice(0, 19)}</span>,
          <span key="actor" className="max-w-[120px] truncate text-xs text-brand-muted">{entry.actorId || 'System'}</span>,
          <StatusBadge key="action" state="NEUTRAL">{entry.action}</StatusBadge>,
          <span key="entity" className="text-xs">
            <span className="font-medium">{entry.entityType}</span>
            <span className="ml-1 text-brand-muted">{entry.entityId.slice(0, 8)}</span>
          </span>,
          <span key="after" className="max-w-[200px] truncate text-xs text-brand-muted">{entry.after}</span>,
        ])}
      />
    </div>
  );
}
