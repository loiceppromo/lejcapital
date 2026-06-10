'use client';

import { useState } from 'react';
import { recordLoanRepayment } from '@/app/actions/loans';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };

export function LoanRepaymentForm({
  loans,
  scheduleItems,
}: {
  loans: SelectOption[];
  scheduleItems: SelectOption[];
}) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      loanId: validateField(form.get('loanId') as string, { required: 'Select a loan' }),
      scheduleItemId: validateField(form.get('scheduleItemId') as string, { required: 'Select a schedule item' }),
      amountReceived: validateField(form.get('amountReceived') as string, { required: 'Payment amount is required', min: 0.01 }),
      dateReceived: validateField(form.get('dateReceived') as string, { required: 'Date received is required' }),
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
    const result = await recordLoanRepayment(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'Repayment recorded', message: 'The repayment allocation and loan schedule were updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to record repayment.';
      setServerError(message);
      toast({ tone: 'error', title: 'Repayment failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Repayment recorded.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Loan" name="loanId" type="select" required error={errors.loanId ?? undefined}
        options={loans.map((l) => ({ value: l.id, label: l.label }))} placeholder="Select loan" />
      <FormField label="Schedule item" name="scheduleItemId" type="select" required error={errors.scheduleItemId ?? undefined}
        options={scheduleItems.map((s) => ({ value: s.id, label: s.label }))} placeholder="Select schedule item" />
      <FormField label="Amount received (GHS)" name="amountReceived" type="number" step="0.01" required error={errors.amountReceived ?? undefined} placeholder="0.00" />
      <FormField label="Date received" name="dateReceived" type="date" required error={errors.dateReceived ?? undefined} />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Recording...' : 'Record repayment'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Payments allocate to fees, then interest, then principal. The selected installment status updates automatically.</p>
    </form>
  );
}
