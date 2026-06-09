'use client';

import { useState } from 'react';
import { addHolding } from '@/app/actions/market';

const INSTRUMENT_TYPES = ['GSE_EQUITY', 'TBILL', 'CASH'] as const;

export function MarketHoldingForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const result = await addHolding(form);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      setError(result.error ?? 'Failed to add holding.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">Holding added.</div>}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</div>}

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
  as?: 'select'; options?: { value: string; label: string }[]; step?: string;
}) {
  const cls = "mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy";
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</label>
      {as === 'select' ? (
        <select name={name} required={required} className={cls}>
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input name={name} type={type} step={step} placeholder={placeholder} required={required} className={cls} />
      )}
    </div>
  );
}
