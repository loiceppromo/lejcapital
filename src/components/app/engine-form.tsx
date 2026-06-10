'use client';

import { useState } from 'react';
import { addEngine, updateEngineInputs } from '@/app/actions/engines';
import { useToast } from './toast';

type Tab = 'add' | 'inputs';
type SelectOption = { id: string; label: string };

export function EngineActionsForm({
  engines,
  cycles,
}: {
  engines: SelectOption[];
  cycles: SelectOption[];
}) {
  const [tab, setTab] = useState<Tab>('inputs');

  return (
    <div>
      <div className="flex gap-1 rounded-md border border-brand-line bg-brand-panel p-1">
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
        {tab === 'inputs' && <UpdateInputsForm engines={engines} cycles={cycles} />}
        {tab === 'add' && <AddEngineForm />}
      </div>
    </div>
  );
}

function AddEngineForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError('');
    const result = await addEngine(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      toast({ tone: 'success', title: 'Engine added', message: 'Engine starts in validation until enough inputs are resolved.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setError(message);
      toast({ tone: 'error', title: 'Engine was not added', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Engine added in VALIDATION status.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}
      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Engine code</label>
        <input name="code" required placeholder="e.g. UNDC, AFH" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono uppercase focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Name</label>
        <input name="name" required placeholder="Full engine name" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>
      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Adding...' : 'Add engine'}
      </button>
    </form>
  );
}

function UpdateInputsForm({ engines, cycles }: { engines: SelectOption[]; cycles: SelectOption[] }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError('');
    const result = await updateEngineInputs(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      toast({ tone: 'success', title: 'Engine inputs updated', message: 'Brand Score and dashboard metrics can now recompute from stored inputs.' });
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setError(message);
      toast({ tone: 'error', title: 'Engine update failed', message });
    }
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
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Engine inputs updated.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Engine</label>
        <select name="engineId" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="">Select engine</option>
          {engines.map((engine) => (
            <option key={engine.id} value={engine.id}>{engine.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Cycle</label>
        <select name="cycleId" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="">Select cycle</option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>{cycle.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-brand-muted">Capital allocated (GHS)</label>
          <input name="capitalAllocated" type="number" step="0.01" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase text-brand-muted">Profit returned (GHS)</label>
          <input name="profitReturned" type="number" step="0.01" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
      </div>

      <p className="text-[11px] font-semibold uppercase text-brand-muted">Brand Score inputs (0-100%)</p>
      <div className="grid grid-cols-2 gap-3">
        {inputs.map(([name, label]) => (
          <div key={name}>
            <label className="block text-xs text-brand-muted">{label}</label>
            <input name={name} type="number" step="0.01" placeholder="TBC" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
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
