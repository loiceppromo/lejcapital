'use client';

import { useState } from 'react';
import { runCycleWaterfall } from '@/app/actions/waterfall';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };

const claims: [string, string][] = [
  ['INVESTOR_PRINCIPAL', 'Investor principal'],
  ['SUPPLIER_LIABILITIES', 'Supplier liabilities'],
  ['TAXES', 'Taxes'],
  ['CUSTOMER_REFUNDS', 'Customer refunds'],
  ['EMERGENCY_PRODUCTION', 'Emergency production'],
  ['RESERVE_REBUILD', 'Reserve rebuild'],
  ['REINVESTMENT', 'Reinvestment'],
  ['EXPANSION', 'Expansion'],
];

export function WaterfallRunForm({ cycles }: { cycles: SelectOption[] }) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
      runDate: validateField(form.get('runDate') as string, { required: 'Run date is required' }),
      totalCashAvailable: validateField(form.get('totalCashAvailable') as string, { required: 'Total cash is required', min: 0 }),
    };
    // Validate each claim amount
    for (const [name] of claims) {
      e[name] = validateField(form.get(name) as string, { required: 'Amount required', min: 0 });
    }
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!validate(formData)) return;

    setPending(true);
    setServerError('');
    const result = await runCycleWaterfall(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'Waterfall run completed', message: 'Priority lines, distributions, ledger postings, and audit records were updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to run waterfall.';
      setServerError(message);
      toast({ tone: 'error', title: 'Waterfall failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Waterfall run recorded.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />
      <FormField label="Run date" name="runDate" type="date" required error={errors.runDate ?? undefined} />
      <FormField label="Total cash available (GHS)" name="totalCashAvailable" type="number" step="0.01" required error={errors.totalCashAvailable ?? undefined} placeholder="0.00" />

      <div className="rounded-md border border-brand-line p-3">
        <div className="mb-3 text-[11px] font-semibold uppercase text-brand-muted">Claims by priority</div>
        <div className="space-y-3">
          {claims.map(([name, label]) => (
            <FormField key={name} label={label} name={name} type="number" step="0.01" required error={errors[name] ?? undefined} placeholder="0.00" />
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
