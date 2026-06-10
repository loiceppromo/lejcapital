'use client';

import { useState } from 'react';
import { runCycleWaterfall } from '@/app/actions/waterfall';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };

const claims = [
  ['INVESTOR_PRINCIPAL', 'Investor principal'],
  ['SUPPLIER_LIABILITIES', 'Supplier liabilities'],
  ['TAXES', 'Taxes'],
  ['CUSTOMER_REFUNDS', 'Customer refunds'],
  ['EMERGENCY_PRODUCTION', 'Emergency production'],
  ['RESERVE_REBUILD', 'Reserve rebuild'],
  ['REINVESTMENT', 'Reinvestment'],
  ['EXPANSION', 'Expansion'],
] as const;

export function WaterfallRunForm({ cycles }: { cycles: SelectOption[] }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await runCycleWaterfall(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      toast({ tone: 'success', title: 'Waterfall run completed', message: 'Priority lines, distributions, ledger postings, and audit records were updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to run waterfall.';
      setError(message);
      toast({ tone: 'error', title: 'Waterfall failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Waterfall run recorded.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <Field label="Cycle" name="cycleId" as="select" options={cycles} required />
      <Field label="Run date" name="runDate" type="date" required />
      <Field label="Total cash available (GHS)" name="totalCashAvailable" type="number" step="0.01" required />

      <div className="rounded-md border border-brand-line p-3">
        <div className="mb-3 text-[11px] font-semibold uppercase text-brand-muted">Claims by priority</div>
        <div className="space-y-3">
          {claims.map(([name, label]) => (
            <Field key={name} label={label} name={name} type="number" step="0.01" required />
          ))}
        </div>
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Running...' : 'Run waterfall'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">The run writes waterfall lines, paid distributions, and an audit record. Enter 0.00 only for a confirmed zero claim.</p>
    </form>
  );
}

function Field({ label, name, type = 'text', required, as, options, step }: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  as?: 'select';
  options?: SelectOption[];
  step?: string;
}) {
  const cls = "mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy";
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase text-brand-muted">{label}</label>
      {as === 'select' ? (
        <select name={name} required={required} className={cls}>
          <option value="">Select {label.toLowerCase()}</option>
          {options?.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      ) : (
        <input name={name} type={type} step={step} required={required} className={cls} />
      )}
    </div>
  );
}
