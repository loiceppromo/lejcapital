'use client';

import { MANUAL_LEDGER_DESTINATIONS } from '@/lib/fund/ledger';

export interface LedgerFilterState {
  account: string;
  direction: string;
  search: string;
}

interface LedgerFiltersProps {
  filters: LedgerFilterState;
  onChange: (filters: LedgerFilterState) => void;
}

export function LedgerFilters({ filters, onChange }: LedgerFiltersProps) {
  function update(field: keyof LedgerFilterState, value: string) {
    onChange({ ...filters, [field]: value });
  }

  const hasFilters = filters.account || filters.direction || filters.search;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[140px]">
        <label htmlFor="ledger-filter-destination" className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Destination</label>
        <select
          id="ledger-filter-destination"
          value={filters.account}
          onChange={(e) => update('account', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        >
          <option value="">All destinations</option>
          {MANUAL_LEDGER_DESTINATIONS.map((acc) => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>
      </div>

      <div className="min-w-[100px]">
        <label htmlFor="ledger-filter-movement" className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Movement</label>
        <select
          id="ledger-filter-movement"
          value={filters.direction}
          onChange={(e) => update('direction', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        >
          <option value="">All</option>
          <option value="IN">Money in</option>
          <option value="OUT">Money out</option>
        </select>
      </div>

      <div className="flex-1 min-w-[180px]">
        <label htmlFor="ledger-filter-search" className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Search</label>
        <input
          id="ledger-filter-search"
          type="text"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Search note or destination..."
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>

      {hasFilters && (
        <button
          onClick={() => onChange({ account: '', direction: '', search: '' })}
          className="rounded-md border border-brand-silver px-2.5 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
        >
          Clear
        </button>
      )}
    </div>
  );
}
