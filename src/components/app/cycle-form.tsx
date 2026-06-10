'use client';

import { useState } from 'react';
import { createCycle, sizeSleeves } from '@/app/actions/cycles';

type Tab = 'create' | 'sleeves';

export function CycleActionsForm() {
  const [tab, setTab] = useState<Tab>('create');

  return (
    <div>
      <div className="flex gap-1 rounded-md border border-brand-line bg-brand-panel p-1">
        {([['create', 'New cycle'], ['sleeves', 'Size sleeves']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold ${tab === key ? 'bg-white text-brand-black shadow-sm' : 'text-brand-muted hover:text-brand-black'}`}
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
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Cycle created in Planning status.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Sequence number</label>
        <input name="sequenceNo" type="number" required placeholder="e.g. 2" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-brand-muted">Start date</label>
          <input name="startDate" type="date" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase text-brand-muted">End date</label>
          <input name="endDate" type="date" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Opening NAV (GHS)</label>
        <input name="openingNAV" type="number" step="0.01" placeholder="Optional" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Creating...' : 'Create cycle'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Creates a cycle in Planning. Transition to Active only after funding is confirmed.</p>
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
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Sleeves sized.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Cycle ID</label>
        <input name="cycleId" required placeholder="Paste cycle ID" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        <p className="mt-1 text-xs leading-5 text-brand-muted">This field will move to a selector once cycle management is fully persisted.</p>
      </div>

      {sleeves.map(([name, label]) => (
        <div key={name}>
          <label className="block text-[11px] font-semibold uppercase text-brand-muted">{label} (GHS)</label>
          <input name={name} type="number" step="0.01" placeholder="0.00" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
      ))}

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Sizing...' : 'Size sleeves'}
      </button>
    </form>
  );
}
