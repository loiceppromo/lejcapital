'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveFundParameters, type FundParameters } from '@/app/actions/system';
import { FormField } from './form-field';
import { useToast } from './toast';

export function FundParamsForm({ params }: { params: FundParameters }) {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    setServerError('');
    const result = await saveFundParameters(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      router.refresh();
      toast({ tone: 'success', title: 'Parameters saved', message: 'Fund parameters updated.' });
      setTimeout(() => setSuccess(false), 2500);
    } else {
      setServerError(result.error ?? 'Failed.');
      toast({ tone: 'error', title: 'Save failed', message: result.error ?? 'Unknown error' });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Parameters saved.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField
          label="Cycle deployment return (%)"
          name="cycleDeploymentReturn"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={params.cycleDeploymentReturn}
          hint="Target return on capital deployed in each cycle (default: 10%)"
        />
        <FormField
          label="Loan rate cap (%)"
          name="loanRateCap"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={params.loanRateCap}
          hint="Maximum annual interest rate allowed for new loans"
        />
        <FormField
          label="Reserve floor (GHS)"
          name="reserveFloor"
          type="number"
          step="0.01"
          min="0"
          defaultValue={params.reserveFloor}
          hint="Minimum reserve sleeve balance to maintain"
        />
      </div>
      <button type="submit" disabled={pending} className="rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Saving...' : 'Save parameters'}
      </button>
    </form>
  );
}
