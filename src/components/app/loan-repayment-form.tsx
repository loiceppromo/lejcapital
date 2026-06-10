'use client';

import { useState } from 'react';
import { recordLoanRepayment } from '@/app/actions/loans';

type SelectOption = { id: string; label: string };

export function LoanRepaymentForm({
  loans,
  scheduleItems,
}: {
  loans: SelectOption[];
  scheduleItems: SelectOption[];
}) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await recordLoanRepayment(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      setError(result.error ?? 'Failed to record repayment.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Repayment recorded.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <SelectField label="Loan" name="loanId" options={loans} />
      <SelectField label="Schedule item" name="scheduleItemId" options={scheduleItems} />

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Amount received (GHS)</label>
        <input name="amountReceived" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Date received</label>
        <input name="dateReceived" type="date" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Recording...' : 'Record repayment'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Payments allocate to fees, then interest, then principal. The selected installment status updates automatically.</p>
    </form>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: SelectOption[] }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase text-brand-muted">{label}</label>
      <select name={name} required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
