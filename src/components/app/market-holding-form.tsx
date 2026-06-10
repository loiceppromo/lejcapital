'use client';

import { useState } from 'react';
import { addHolding } from '@/app/actions/market';
import { useToast } from './toast';

const INSTRUMENT_TYPES = ['GSE_EQUITY', 'TBILL', 'CASH'] as const;
type SelectOption = { id: string; label: string };

export function MarketHoldingForm({ cycles }: { cycles: SelectOption[] }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const result = await addHolding(form);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      toast({ tone: 'success', title: 'Holding added', message: 'Market portfolio, ledger, and audit records were updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to add holding.';
      setError(message);
      toast({ tone: 'error', title: 'Holding was not added', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Holding added.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <Field label="Cycle" name="cycleId" as="select" options={cycles} required />
      <Field label="Instrument type" name="instrumentType" as="select" options={INSTRUMENT_TYPES.map((t) => ({ value: t, label: t.replaceAll('_', ' ') }))} />
      <Field label="Name / ticker" name="name" placeholder="e.g. MTNGH, 91-day T-Bill" required />
      <Field label="Amount invested (GHS)" name="amountInvested" type="number" step="0.01" required />
      <Field label="Current value (GHS)" name="currentValue" type="number" step="0.01" />
      <Field label="Return rate (%)" name="returnRate" type="number" step="0.01" />
      <Field label="Purchase date" name="purchaseDate" type="date" required />
      <Field label="Maturity date" name="maturityDate" type="date" />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Adding...' : 'Add holding'}
      </button>
    </form>
  );
}

function Field({ label, name, type = 'text', placeholder, required, as, options, step }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
  as?: 'select'; options?: Array<{ value?: string; id?: string; label: string }>; step?: string;
}) {
  const cls = "mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy";
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase text-brand-muted">{label}</label>
      {as === 'select' ? (
        <select name={name} required={required} className={cls}>
          <option value="">Select {label.toLowerCase()}</option>
          {options?.map((o) => <option key={o.value ?? o.id} value={o.value ?? o.id}>{o.label}</option>)}
        </select>
      ) : (
        <input name={name} type={type} step={step} placeholder={placeholder} required={required} className={cls} />
      )}
    </div>
  );
}
