'use client';

import { useState } from 'react';
import { originateLoan } from '@/app/actions/loans';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };

export function LoanOriginationForm({
  borrowers,
  cycles,
}: {
  borrowers: SelectOption[];
  cycles: SelectOption[];
}) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      borrowerId: validateField(form.get('borrowerId') as string, { required: 'Select a borrower' }),
      principal: validateField(form.get('principal') as string, { required: 'Principal amount is required', min: 1 }),
      interestRate: validateField(form.get('interestRate') as string, { required: 'Interest rate is required', min: 0, max: 100 }),
      termMonths: validateField(form.get('termMonths') as string, { required: 'Loan term is required', min: 1, max: 120 }),
      disbursementDate: validateField(form.get('disbursementDate') as string, { required: 'Disbursement date is required' }),
      originationFee: validateField(form.get('originationFee') as string, { min: 0 }),
      collateralValue: validateField(form.get('collateralValue') as string, { min: 0 }),
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
    const result = await originateLoan(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'Loan originated', message: 'Schedule, loan book, ledger, and audit records were updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Loan origination failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Loan originated.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField
        label="Borrower"
        name="borrowerId"
        type="select"
        required
        error={errors.borrowerId ?? undefined}
        options={borrowers.map((b) => ({ value: b.id, label: b.label }))}
        placeholder="Select borrower"
      />

      <FormField
        label="Funding cycle"
        name="fundingCycleId"
        type="select"
        options={cycles.map((c) => ({ value: c.id, label: c.label }))}
        placeholder="No cycle selected"
        hint="Optional — link this loan to a specific cycle"
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Principal (GHS)"
          name="principal"
          type="number"
          step="0.01"
          required
          error={errors.principal ?? undefined}
          placeholder="0.00"
        />
        <FormField
          label="Interest rate (%)"
          name="interestRate"
          type="number"
          step="0.01"
          required
          error={errors.interestRate ?? undefined}
          placeholder="e.g. 24"
          hint="Annual rate"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Term (months)"
          name="termMonths"
          type="number"
          required
          error={errors.termMonths ?? undefined}
          placeholder="e.g. 6"
          min={1}
          max={120}
        />
        <FormField
          label="Interest method"
          name="interestMethod"
          type="select"
          options={[
            { value: 'REDUCING_BALANCE', label: 'Reducing balance' },
            { value: 'FLAT', label: 'Flat' },
          ]}
        />
      </div>

      <FormField
        label="Disbursement date"
        name="disbursementDate"
        type="date"
        required
        error={errors.disbursementDate ?? undefined}
        hint="The repayment schedule is generated from this date when the loan is originated."
      />

      <FormField
        label="Origination fee (GHS)"
        name="originationFee"
        type="number"
        step="0.01"
        error={errors.originationFee ?? undefined}
        placeholder="0.00"
      />

      <FormField
        label="Origination fee method"
        name="originationFeeMethod"
        type="select"
        options={[
          { value: 'DEDUCT_FROM_DISBURSEMENT', label: 'Deduct from disbursement' },
          { value: 'ADD_TO_BALANCE', label: 'Add to balance' },
        ]}
      />

      <FormField
        label="Repayment allocation order"
        name="repaymentAllocOrder"
        type="select"
        options={[
          { value: 'FEES_INTEREST_PRINCIPAL', label: 'Fees, interest, principal' },
          { value: 'FEES_PRINCIPAL_INTEREST', label: 'Fees, principal, interest' },
          { value: 'PRINCIPAL_INTEREST_FEES', label: 'Principal, interest, fees' },
        ]}
      />

      <FormField
        label="Collateral description"
        name="collateralDesc"
        placeholder="e.g. Vehicle, Property"
      />

      <FormField
        label="Collateral value (GHS)"
        name="collateralValue"
        type="number"
        step="0.01"
        error={errors.collateralValue ?? undefined}
      />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Originating...' : 'Originate loan'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Origination activates the loan and writes the full amortization schedule to the loan book.</p>
    </form>
  );
}
