'use client';

import { useState } from 'react';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { LedgerForm } from '@/components/app/ledger-form';
import { LedgerFilters, type LedgerFilterState } from '@/components/app/ledger-filters';
import { Decimal } from '@/lib/finance';
import { money } from '@/lib/platform/selectors';
import {
  createLedgerEntry,
  summarizeByAccount,
  filterEntries,
  computeRunningBalance,
  type LedgerEntryInput,
} from '@/lib/fund/ledger';
import { addLedgerEntry } from '@/app/actions/ledger';
import type { LedgerEntry } from '@/lib/platform/types';

/** JSON-safe version of LedgerEntry — amount is a string, not Decimal */
export interface SerializedLedgerEntry {
  id: string;
  date: string;
  account: string;
  description: string;
  direction: 'IN' | 'OUT';
  amount: string;
  source: string;
  cycleId?: string | null;
}

function hydrate(entries: SerializedLedgerEntry[]): LedgerEntry[] {
  return entries.map((e) => ({ ...e, amount: new Decimal(e.amount) }));
}

export function LedgerPageClient({
  initialEntries,
  dbConnected,
  activeCycleId,
}: {
  initialEntries: SerializedLedgerEntry[];
  dbConnected: boolean;
  activeCycleId: string;
}) {
  const [entries, setEntries] = useState<LedgerEntry[]>(() => hydrate(initialEntries));
  const [filters, setFilters] = useState<LedgerFilterState>({
    account: '',
    direction: '',
    source: '',
    search: '',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleAddEntry(input: LedgerEntryInput) {
    const entryInput = { ...input, cycleId: activeCycleId };

    if (dbConnected) {
      const form = new FormData();
      form.set('date', entryInput.date);
      form.set('account', entryInput.account);
      form.set('description', entryInput.description);
      form.set('direction', entryInput.direction);
      form.set('amount', entryInput.amount);
      form.set('source', entryInput.source);
      form.set('cycleId', entryInput.cycleId);
      const result = await addLedgerEntry(form);
      if (!result.ok) return result;
    }

    const entry = createLedgerEntry(entryInput, entries);
    setEntries((prev) => [...prev, entry]);
    return { ok: true };
  }

  const filtered = filterEntries(entries, {
    account: filters.account || undefined,
    direction: (filters.direction as 'IN' | 'OUT') || undefined,
    source: filters.source || undefined,
    search: filters.search || undefined,
  });

  const withBalance = computeRunningBalance(filtered);

  const cashIn = entries
    .filter((e) => e.direction === 'IN')
    .reduce((sum, e) => sum.plus(e.amount), new Decimal(0));
  const cashOut = entries
    .filter((e) => e.direction === 'OUT')
    .reduce((sum, e) => sum.plus(e.amount), new Decimal(0));
  const netMovement = cashIn.minus(cashOut);

  const accountSummary = summarizeByAccount(entries);

  return (
    <>
      <PageHeader
        title="Ledger"
        description="Append-only cash movement register. Every financial action produces a ledger entry."
        action={
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-md bg-brand-navy px-3 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark"
          >
            Add entry
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Cash in" value={money(cashIn)} />
        <KpiCard label="Cash out" value={money(cashOut)} />
        <KpiCard label="Net movement" value={money(netMovement)} state={netMovement.gte(0) ? 'GREEN' : 'BREACH'} />
        <KpiCard label="Entries" value={String(entries.length)} detail={`${filtered.length} shown`} />
      </div>

      <div className="mt-5">
        <SectionCard title="By account" description="Net position per account category.">
          <DataTable
            headers={['Account', 'In', 'Out', 'Net', 'Entries']}
            maxHeight="max-h-64"
            rows={accountSummary.map((row) => [
              <span key="acc" className="font-medium">{row.account}</span>,
              <span key="in" className="text-emerald-700">{money(row.totalIn)}</span>,
              <span key="out" className="text-red-700">{money(row.totalOut)}</span>,
              <span key="net" className={row.net.gte(0) ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{money(row.net)}</span>,
              String(row.count),
            ])}
          />
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard
          title="All entries"
          description="Filtered view. Corrections are new entries, not edits."
          action={<span className="text-xs text-brand-muted">{filtered.length} of {entries.length} entries</span>}
        >
          <div className="mb-4">
            <LedgerFilters filters={filters} onChange={setFilters} />
          </div>
          <DataTable
            headers={['Date', 'Account', 'Description', 'Direction', 'Amount', 'Balance', 'Source']}
            maxHeight="max-h-[480px]"
            rows={withBalance.map((entry) => [
              entry.date,
              entry.account,
              <span key="desc" className="text-brand-muted">{entry.description}</span>,
              <span key="dir" className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${entry.direction === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{entry.direction}</span>,
              <span key="amt" className="font-mono">{money(entry.amount)}</span>,
              <span key="bal" className={`font-mono ${entry.runningBalance.gte(0) ? 'text-brand-black' : 'text-red-700'}`}>{money(entry.runningBalance)}</span>,
              <span key="src" className="text-xs text-brand-muted">{entry.source}</span>,
            ])}
          />
        </SectionCard>
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-brand-silver bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-brand-silver bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-brand-black">New ledger entry</h2>
              <button onClick={() => setDrawerOpen(false)} className="rounded-md border border-brand-silver px-2.5 py-1 text-xs font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black">Close</button>
            </div>
            <div className="p-5">
              <LedgerForm onSubmit={handleAddEntry} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
