'use client';

export interface AuditFilterState {
  action: string;
  entityType: string;
  search: string;
}

interface AuditFiltersProps {
  filters: AuditFilterState;
  onChange: (filters: AuditFilterState) => void;
  actions: string[];
  entityTypes: string[];
}

export function AuditFilters({ filters, onChange, actions, entityTypes }: AuditFiltersProps) {
  function update(field: keyof AuditFilterState, value: string) {
    onChange({ ...filters, [field]: value });
  }

  const hasFilters = filters.action || filters.entityType || filters.search;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[160px]">
        <label htmlFor="audit-filter-action" className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Action</label>
        <select
          id="audit-filter-action"
          value={filters.action}
          onChange={(e) => update('action', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="min-w-[140px]">
        <label htmlFor="audit-filter-entity" className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Entity</label>
        <select
          id="audit-filter-entity"
          value={filters.entityType}
          onChange={(e) => update('entityType', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        >
          <option value="">All entities</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="min-w-[180px] flex-1">
        <label htmlFor="audit-filter-search" className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Search</label>
        <input
          id="audit-filter-search"
          type="text"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Search actor, action, entity..."
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>

      {hasFilters && (
        <button
          onClick={() => onChange({ action: '', entityType: '', search: '' })}
          className="rounded-md border border-brand-silver px-2.5 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
        >
          Clear
        </button>
      )}
    </div>
  );
}
