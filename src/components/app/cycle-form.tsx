'use client';

import { useState } from 'react';
import { createCycle, sizeSleeves } from '@/app/actions/cycles';

type Tab = 'create' | 'sleeves';

export function CycleActionsForm() {
  const [tab, setTab] = useState<Tab>('create');

  return (
    <div>
      <div className="flex gap-1 rounded-md bg-brand-surface p-1">
        {([['create', 'New cycle'], ['sleeves', 'Size sleeves']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold ${tab === key ? 'bg-white text-brand-black shadow-sm' : 'text-brand-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 'create' && <CreateCycleForm />}
        {tab === 'sleeves' && <SizeSleeveForm />}
      </div>
    </div>
  );
}

function CreateCycleForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError('');
    const result = await createCycle(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) { setSuccess(true); (e.target as HTMLFormElement).reset(); setTimeout(() => setSuccess(false), 2500); }
    else setError(result.error ?? 'Failed.');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">Cycle created in PLANNING status.</div>}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</div>}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Sequence number</label>
        <input name="sequenceNo" type="number" required placeholder="e.g. 2" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Start date</label>
          <input name="startDate" type="date" required className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">End date</label>
          <input name="endDate" type="date" required className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Opening NAV (GHS)</label>
        <input name="openingNAV" type="number" step="0.01" placeholder="Optional" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Creating...' : 'Create cycle'}
      </button>
      <p className="text-xs text-brand-muted">Creates cycle in PLANNING. Transition to ACTIVE when funded.</p>
    </form>
  );
}

function SizeSleeveForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError('');
    const result = await sizeSleeves(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) { setSuccess(true); setTimeout(() => setSuccess(false), 2500); }
    else setError(result.error ?? 'Failed.');
  }

  const sleeves = [
    ['protection', 'Protection'],
    ['operatingAlpha', 'Operating Alpha'],
    ['marketAlpha', 'Market Alpha'],
    ['reserve', 'Reserve'],
    ['loanBook', 'Loan Book'],
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">Sleeves sized.</div>}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</div>}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Cycle ID</label>
        <input name="cycleId" required placeholder="Paste cycle ID" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      {sleeves.map(([name, label]) => (
        <div key={name}>
          <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">{label} (GHS)</label>
          <input name={name} type="number" step="0.01" placeholder="0.00" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
      ))}

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Sizing...' : 'Size sleeves'}
      </button>
    </form>
  );
}
