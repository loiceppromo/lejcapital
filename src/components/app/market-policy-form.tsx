'use client';

import { useState } from 'react';
import { updateMarketPolicy } from '@/app/actions/market-policy';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };

export function MarketPolicyForm({ cycles }: { cycles: SelectOption[] }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await updateMarketPolicy(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      toast({ tone: 'success', title: 'Market policy updated', message: 'Regime request and gate evidence were saved.' });
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to update market policy.';
      setError(message);
      toast({ tone: 'error', title: 'Market policy failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Market policy updated.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Cycle</label>
        <select name="cycleId" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="">Select cycle</option>
          {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Requested regime</label>
        <select name="requestedRegime" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="DEFENSIVE">Defensive</option>
          <option value="NORMAL">Normal</option>
          <option value="OPPORTUNISTIC">Opportunistic</option>
        </select>
      </div>

      <div className="rounded-md border border-brand-line p-3">
        <div className="mb-3 text-[11px] font-semibold uppercase text-brand-muted">Opportunistic gate evidence</div>
        <Check name="undcDemandValidated" label="UNDC demand validated" />
        <TextArea name="undcDemandRationale" label="UNDC demand rationale" />
        <Check name="marketCatalystDocumented" label="Documented market catalyst" />
        <TextArea name="marketCatalystRationale" label="Market catalyst rationale" />
        <Check name="noOpenOperationalIssues" label="No open operational issues" />
        <TextArea name="operationalRationale" label="Operational clearance rationale" />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Saving...' : 'Update market policy'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">PCR &gt;= 1.25x is derived automatically. If Opportunistic gates fail, the finance engine downgrades the effective regime.</p>
    </form>
  );
}

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="mb-2 flex items-center gap-2 text-sm text-brand-black">
      <input name={name} type="checkbox" className="h-4 w-4 rounded border-brand-line text-brand-navy focus:ring-brand-navy" />
      <span>{label}</span>
    </label>
  );
}

function TextArea({ name, label }: { name: string; label: string }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold uppercase text-brand-muted">{label}</label>
      <textarea name={name} rows={2} className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
    </div>
  );
}
