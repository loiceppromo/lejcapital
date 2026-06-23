'use client';

import { useState } from 'react';
import { ActionDrawer } from '@/components/app/action-drawer';
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
  canAddEntry = true,
}: {
  initialEntries: SerializedLedgerEntry[];
  dbConnected: boolean;
  activeCycleId: string | null;
  canAddEntry?: boolean;
}) {
  const [entries, setEntries] = useState<LedgerEntry[]>(() => hydrate(initialEntries));
  const [filters, setFilters] = useState<LedgerFilterState>({
    account: '',
    direction: '',
    search: '',
  });

  async function handleAddEntry(input: LedgerEntryInput) {
    if (!activeCycleId) {
      return { ok: false, error: 'Create a real cycle first before adding ledger entries.' };
    }
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
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Ledger' }]}
        title="Ledger"
        description="Immutable register of cash received and paid. Records facts — allocation decisions are made in the Decision Centre."
        action={
          canAddEntry && activeCycleId ? (
            <ActionDrawer label="Add entry" title="New ledger entry">
              <LedgerForm onSubmit={handleAddEntry} />
            </ActionDrawer>
          ) : undefined
        }
      />

      {!activeCycleId && (
        <div className="mb-5 rounded-md border border-brand-line bg-brand-panel px-4 py-3 text-sm text-brand-muted">
          Create Cycle 1 before adding ledger entries. Existing entries will still appear here after import or setup.
        </div>
      )}

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
            headers={['Date', 'Destination', 'Note', 'Movement', 'Amount', 'Balance']}
            maxHeight="max-h-[480px]"
            rows={withBalance.map((entry) => [
              entry.date,
              entry.account,
              <span key="desc" className="text-brand-muted">{entry.description}</span>,
              <span key="dir" className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${entry.direction === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{entry.direction === 'IN' ? 'Money in' : 'Money out'}</span>,
              <span key="amt" className="font-mono">{money(entry.amount)}</span>,
              <span key="bal" className={`font-mono ${entry.runningBalance.gte(0) ? 'text-brand-black' : 'text-red-700'}`}>{money(entry.runningBalance)}</span>,
            ])}
          />
        </SectionCard>
      </div>
    </>
  );
}
