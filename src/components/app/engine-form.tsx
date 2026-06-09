'use client';

import { useState } from 'react';
import { addEngine, updateEngineInputs } from '@/app/actions/engines';

type Tab = 'add' | 'inputs';

export function EngineActionsForm() {
  const [tab, setTab] = useState<Tab>('inputs');

  return (
    <div>
      <div className="flex gap-1 rounded-md bg-brand-surface p-1">
        {([['inputs', 'Update inputs'], ['add', 'Add engine']] as const).map(([key, label]) => (
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
        {tab === 'inputs' && <UpdateInputsForm />}
        {tab === 'add' && <AddEngineForm />}
      </div>
    </div>
  );
}

function AddEngineForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError('');
    const result = await addEngine(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) { setSuccess(true); (e.target as HTMLFormElement).reset(); setTimeout(() => setSuccess(false), 2500); }
    else setError(result.error ?? 'Failed.');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">Engine added in VALIDATION status.</div>}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</div>}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Engine code</label>
        <input name="code" required placeholder="e.g. UNDC, AFH" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm font-mono uppercase focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Name</label>
        <input name="name" required placeholder="Full engine name" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>
      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Adding...' : 'Add engine'}
      </button>
    </form>
  );
}

function UpdateInputsForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError('');
    const result = await updateEngineInputs(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) { setSuccess(true); setTimeout(() => setSuccess(false), 2500); }
    else setError(result.error ?? 'Failed.');
  }

  const inputs = [
    ['roic', 'ROIC (%)'],
    ['cashConversion', 'Cash conversion (%)'],
    ['sellThrough', 'Sell-through (%)'],
    ['repeatDemand', 'Repeat demand (%)'],
    ['operationalRisk', 'Operational risk (%)'],
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">Engine inputs updated.</div>}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</div>}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Engine ID</label>
        <input name="engineId" required placeholder="Paste engine ID" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Cycle ID</label>
        <input name="cycleId" required placeholder="Paste cycle ID" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Capital allocated (GHS)</label>
          <input name="capitalAllocated" type="number" step="0.01" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Profit returned (GHS)</label>
          <input name="profitReturned" type="number" step="0.01" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Brand Score inputs (0-100%)</p>
      <div className="grid grid-cols-2 gap-3">
        {inputs.map(([name, label]) => (
          <div key={name}>
            <label className="block text-xs text-brand-muted">{label}</label>
            <input name={name} type="number" step="0.01" placeholder="TBC" className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
          </div>
        ))}
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Updating...' : 'Update inputs'}
      </button>
      <p className="text-xs text-brand-muted">Empty fields stay TBC. Brand Score auto-derives from the 5 inputs.</p>
    </form>
  );
}
