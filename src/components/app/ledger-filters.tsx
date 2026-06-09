'use client';

import { LEDGER_ACCOUNTS, LEDGER_SOURCES } from '@/lib/fund/ledger';

export interface LedgerFilterState {
  account: string;
  direction: string;
  source: string;
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

  const hasFilters = filters.account || filters.direction || filters.source || filters.search;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[140px]">
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Account</label>
        <select
          value={filters.account}
          onChange={(e) => update('account', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        >
          <option value="">All accounts</option>
          {LEDGER_ACCOUNTS.map((acc) => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>
      </div>

      <div className="min-w-[100px]">
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Direction</label>
        <select
          value={filters.direction}
          onChange={(e) => update('direction', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        >
          <option value="">All</option>
          <option value="IN">Cash In</option>
          <option value="OUT">Cash Out</option>
        </select>
      </div>

      <div className="min-w-[130px]">
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Source</label>
        <select
          value={filters.source}
          onChange={(e) => update('source', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        >
          <option value="">All sources</option>
          {LEDGER_SOURCES.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Search</label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Search description, account, source..."
          className="mt-1 w-full rounded-md border border-brand-silver px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>

      {hasFilters && (
        <button
          onClick={() => onChange({ account: '', direction: '', source: '', search: '' })}
          className="rounded-md border border-brand-silver px-2.5 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
        >
          Clear
        </button>
      )}
    </div>
  );
}
