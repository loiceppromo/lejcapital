'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addLedgerEntry } from '@/app/actions/ledger';
import { useToast } from './toast';

const DESTINATIONS = ['Businesses', 'T-Bills', 'Stocks'] as const;

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Accra', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function DashboardCashEntry({ cycleId }: { cycleId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState<(typeof DESTINATIONS)[number]>('Businesses');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cycleId) {
      toast({ tone: 'error', title: 'Create Cycle 1 first', message: 'A real cycle is required before recording cash movements.' });
      return;
    }
    setPending(true);
    const formData = new FormData();
    formData.set('date', today());
    formData.set('account', destination);
    formData.set('description', note.trim() || `${direction === 'IN' ? 'Cash received' : 'Cash paid'} — ${destination}`);
    formData.set('direction', direction);
    formData.set('amount', amount);
    formData.set('source', 'Manual');
    formData.set('cycleId', cycleId);
    const result = await addLedgerEntry(formData);
    setPending(false);
    if (!result.ok) {
      toast({ tone: 'error', title: 'Entry not recorded', message: result.error ?? 'Review the entry and try again.' });
      return;
    }
    setAmount('');
    setNote('');
    toast({ tone: 'success', title: direction === 'IN' ? 'Money received recorded' : 'Money paid recorded', message: `${destination} entry was saved and audit-logged.` });
    router.refresh();
  }

  return (
    <section className="mb-5 rounded-lg border border-brand-line bg-brand-panel px-5 py-4 shadow-sm">
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Quick cash entry</p>
        <p className="mt-1 text-sm text-brand-muted">Record money received or paid without leaving the dashboard.</p>
      </div>
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[auto_auto_minmax(120px,1fr)_minmax(150px,1.4fr)_auto] sm:items-end">
        <div className="grid grid-cols-2 rounded-md border border-brand-line bg-brand-surface p-1">
          <button type="button" onClick={() => setDirection('IN')} className={`rounded px-3 py-1.5 text-xs font-semibold ${direction === 'IN' ? 'bg-emerald-50 text-emerald-800' : 'text-brand-muted'}`}>Money in</button>
          <button type="button" onClick={() => setDirection('OUT')} className={`rounded px-3 py-1.5 text-xs font-semibold ${direction === 'OUT' ? 'bg-red-50 text-red-800' : 'text-brand-muted'}`}>Money out</button>
        </div>
        <label className="block">
          <span className="sr-only">Amount in GHS</span>
          <input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount (GHS)" className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm text-brand-black outline-none focus:border-brand-navy" />
        </label>
        <label className="block">
          <span className="sr-only">Destination</span>
          <select value={destination} onChange={(event) => setDestination(event.target.value as (typeof DESTINATIONS)[number])} className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm text-brand-black outline-none focus:border-brand-navy">
            {DESTINATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Note</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm text-brand-black outline-none focus:border-brand-navy" />
        </label>
        <button disabled={pending} className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Saving…' : 'Record'}</button>
      </form>
    </section>
  );
}
