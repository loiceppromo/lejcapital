'use client';

import { useState } from 'react';
import { recordICDecision } from '@/app/actions/governance';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };

export function ICDecisionForm({ cycles }: { cycles: SelectOption[] }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await recordICDecision(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      toast({ tone: 'success', title: 'IC decision recorded', message: 'Decision and rationale were saved for governance review.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to record IC decision.';
      setError(message);
      toast({ tone: 'error', title: 'IC decision failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">IC decision recorded.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Cycle</label>
        <select name="cycleId" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="">Select cycle</option>
          {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}
        </select>
      </div>

      <Field label="Position" name="position" placeholder="UNDC, AFH, GSE, T-Bills/Cash, Loans" required />

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Decision</label>
        <select name="decision" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="">Select decision</option>
          <option value="INCREASE">Increase</option>
          <option value="MAINTAIN">Maintain</option>
          <option value="REDUCE">Reduce</option>
          <option value="EXIT">Exit</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Rationale</label>
        <textarea name="rationale" required rows={5} className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Recording...' : 'Record IC decision'}
      </button>
    </form>
  );
}

function Field({ label, name, placeholder, required }: { label: string; name: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase text-brand-muted">{label}</label>
      <input name={name} placeholder={placeholder} required={required} className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
    </div>
  );
}
