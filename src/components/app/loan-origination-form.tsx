'use client';

import { useState } from 'react';
import { originateLoan } from '@/app/actions/loans';

type SelectOption = { id: string; label: string };

export function LoanOriginationForm({
  borrowers,
  cycles,
}: {
  borrowers: SelectOption[];
  cycles: SelectOption[];
}) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await originateLoan(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      setError(result.error ?? 'Failed.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Loan originated.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Borrower</label>
        <select name="borrowerId" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="">Select borrower</option>
          {borrowers.map((borrower) => (
            <option key={borrower.id} value={borrower.id}>{borrower.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Funding cycle</label>
        <select name="fundingCycleId" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="">No cycle selected</option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>{cycle.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-brand-muted">Principal (GHS)</label>
          <input name="principal" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase text-brand-muted">Interest rate (%)</label>
          <input name="interestRate" type="number" step="0.01" required placeholder="e.g. 24" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-brand-muted">Term (months)</label>
          <input name="termMonths" type="number" required placeholder="e.g. 6" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase text-brand-muted">Interest method</label>
          <select name="interestMethod" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
            <option value="REDUCING_BALANCE">Reducing balance</option>
            <option value="FLAT">Flat</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Disbursement date</label>
        <input name="disbursementDate" type="date" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
        <p className="mt-1 text-xs leading-5 text-brand-muted">The repayment schedule is generated from this date when the loan is originated.</p>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Origination fee (GHS)</label>
        <input name="originationFee" type="number" step="0.01" placeholder="0.00" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Origination fee method</label>
        <select name="originationFeeMethod" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="DEDUCT_FROM_DISBURSEMENT">Deduct from disbursement</option>
          <option value="ADD_TO_BALANCE">Add to balance</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Repayment allocation order</label>
        <select name="repaymentAllocOrder" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="FEES_INTEREST_PRINCIPAL">Fees, interest, principal</option>
          <option value="FEES_PRINCIPAL_INTEREST">Fees, principal, interest</option>
          <option value="PRINCIPAL_INTEREST_FEES">Principal, interest, fees</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Collateral description</label>
        <input name="collateralDesc" placeholder="e.g. Vehicle, Property" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Collateral value (GHS)</label>
        <input name="collateralValue" type="number" step="0.01" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Originating...' : 'Originate loan'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Origination activates the loan and writes the full amortization schedule to the loan book.</p>
    </form>
  );
}
