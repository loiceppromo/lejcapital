'use client';

import { useState } from 'react';
import { addHolding } from '@/app/actions/market';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };

export function MarketHoldingForm({ cycles }: { cycles: SelectOption[] }) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
      name: validateField(form.get('name') as string, { required: 'Instrument name is required', minLength: 2 }),
      amountInvested: validateField(form.get('amountInvested') as string, { required: 'Investment amount is required', min: 0.01 }),
      purchaseDate: validateField(form.get('purchaseDate') as string, { required: 'Purchase date is required' }),
      currentValue: validateField(form.get('currentValue') as string, { min: 0 }),
      returnRate: validateField(form.get('returnRate') as string, { min: -100, max: 1000 }),
    };
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!validate(formData)) return;

    setPending(true);
    setServerError('');
    const result = await addHolding(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'Holding added', message: 'Market portfolio, ledger, and audit records were updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to add holding.';
      setServerError(message);
      toast({ tone: 'error', title: 'Holding was not added', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Holding added.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />
      <FormField label="Instrument type" name="instrumentType" type="select"
        options={[
          { value: 'GSE_EQUITY', label: 'GSE Equity' },
          { value: 'TBILL', label: 'T-Bill' },
          { value: 'CASH', label: 'Cash' },
        ]}
      />
      <FormField label="Name / ticker" name="name" required error={errors.name ?? undefined} placeholder="e.g. MTNGH, 91-day T-Bill" />
      <FormField label="Amount invested (GHS)" name="amountInvested" type="number" step="0.01" required error={errors.amountInvested ?? undefined} placeholder="0.00" />
      <FormField label="Current value (GHS)" name="currentValue" type="number" step="0.01" error={errors.currentValue ?? undefined} hint="Leave blank if same as invested" />
      <FormField label="Return rate (%)" name="returnRate" type="number" step="0.01" error={errors.returnRate ?? undefined} />
      <FormField label="Purchase date" name="purchaseDate" type="date" required error={errors.purchaseDate ?? undefined} />
      <FormField label="Maturity date" name="maturityDate" type="date" hint="Required for T-Bills" />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Adding...' : 'Add holding'}
      </button>
    </form>
  );
}
