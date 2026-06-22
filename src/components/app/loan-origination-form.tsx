'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { originateLoan } from '@/app/actions/loans';
import { computeRecommendedRate, Decimal, type RiskGrade } from '@/lib/finance';
import type { LoanPricingContext } from '@/lib/platform/types';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type BorrowerOption = { id: string; label: string; riskGrade: RiskGrade };
type SelectOption = { id: string; label: string };

function today() { return new Date().toISOString().slice(0, 10); }
function monthsUntil(disbursementDate: string, repaymentDate: string) {
  const start = new Date(`${disbursementDate}T12:00:00Z`);
  const end = new Date(`${repaymentDate}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  if (end.getUTCDate() > start.getUTCDate()) months += 1;
  return Math.max(1, months);
}

export function LoanOriginationForm({
  borrowers,
  cycles,
  pricingContext,
}: {
  borrowers: BorrowerOption[];
  cycles: SelectOption[];
  pricingContext: LoanPricingContext;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [borrowerId, setBorrowerId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(today());
  const [repaymentDate, setRepaymentDate] = useState('');
  const toast = useToast();

  const selectedBorrower = borrowers.find((borrower) => borrower.id === borrowerId);
  const pricing = useMemo(() => {
    const term = monthsUntil(disbursementDate, repaymentDate);
    if (!pricingContext.tbill91Rate || !principal || !term || !selectedBorrower) return null;
    try {
      const principalAmount = new Decimal(principal || 0);
      if (!principalAmount.isFinite() || principalAmount.lte(0)) return null;
      return computeRecommendedRate({
        principal: principalAmount,
        termMonths: term,
        riskGrade: selectedBorrower.riskGrade,
        tbill91Rate: pricingContext.tbill91Rate,
        pcr: pricingContext.pcr,
        pcrStatus: pricingContext.pcrStatus,
        investorPrincipalDue: pricingContext.investorPrincipalDue,
        currentNAV: pricingContext.currentNAV,
        par30: pricingContext.par30,
        par90: pricingContext.par90,
        defaultRate: pricingContext.defaultRate,
        loanBookOutstanding: pricingContext.loanBookOutstanding,
        totalProvisions: pricingContext.totalProvisions,
        activeLoanCount: pricingContext.activeLoanCount,
      });
    } catch {
      return null;
    }
  }, [pricingContext, principal, selectedBorrower, disbursementDate, repaymentDate]);

  const rateCap = new Decimal(pricingContext.loanRateCap || '60');
  const recommendedExceedsCap = pricing ? pricing.recommended.gt(rateCap) : false;

  function formatMoney(value: Decimal): string {
    return `GHS ${value.toNumber().toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      borrowerId: validateField(form.get('borrowerId') as string, { required: 'Select a borrower' }),
      principal: validateField(form.get('principal') as string, { required: 'Principal amount is required', min: 1 }),
      disbursementDate: validateField(form.get('disbursementDate') as string, { required: 'Disbursement date is required' }),
      repaymentDate: validateField(form.get('repaymentDate') as string, { required: 'Final repayment date is required' }),
    };
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!validate(formData)) return;
    if (!pricing) {
      setServerError('Automatic pricing is unavailable. Add a T-Bill benchmark and complete borrower, amount, and term first.');
      return;
    }

    setPending(true);
    setServerError('');
    const result = await originateLoan(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      router.refresh();
      toast({ tone: 'success', title: 'Loan originated', message: `Rate was set automatically at ${pricing.recommended.toFixed(2)}% p.a.` });
      (e.target as HTMLFormElement).reset();
      setBorrowerId('');
      setPrincipal('');
      setRepaymentDate('');
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
        value={borrowerId}
        onChange={setBorrowerId}
        error={errors.borrowerId ?? undefined}
        options={borrowers.map((b) => ({ value: b.id, label: b.label }))}
        placeholder="Select borrower"
      />

      {pricing && (
        <div className="rounded-lg border border-brand-line bg-brand-panel p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Smart rate recommendation</p>
              <p className="mt-1 text-2xl font-bold text-brand-black">{pricing.recommended.toFixed(2)}% p.a.</p>
              <p className="mt-1 text-xs text-brand-muted">
                Floor {pricing.floor.toFixed(2)}% · Ceiling {pricing.ceiling.toFixed(2)}% · Risk {pricing.riskLevel}
              </p>
            </div>
            <div className="rounded-md border border-brand-line bg-white px-3 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">Applied automatically</p>
              <p className="font-mono text-sm font-semibold text-brand-black">{pricing.recommended.toFixed(2)}%</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-brand-charcoal">{pricing.rationale}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md bg-white p-2">
              <p className="text-[10px] font-semibold uppercase text-brand-muted">T-Bill alternative</p>
              <p className="font-mono text-sm font-semibold">{formatMoney(pricing.opportunityCost.tbillReturn)}</p>
            </div>
            <div className="rounded-md bg-white p-2">
              <p className="text-[10px] font-semibold uppercase text-brand-muted">Loan gross interest</p>
              <p className="font-mono text-sm font-semibold">{formatMoney(pricing.opportunityCost.recommendedGrossInterest)}</p>
            </div>
            <div className="rounded-md bg-white p-2">
              <p className="text-[10px] font-semibold uppercase text-brand-muted">Net spread after loss</p>
              <p className={`font-mono text-sm font-semibold ${pricing.opportunityCost.netExpectedSpread.lt(0) ? 'text-[#9b2f28]' : 'text-[#1f5d42]'}`}>
                {formatMoney(pricing.opportunityCost.netExpectedSpread)}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {pricing.redTeamFindings.slice(0, 3).map((finding) => (
              <div key={`${finding.severity}-${finding.finding}`} className="rounded-md border border-brand-line bg-white px-2.5 py-2 text-xs">
                <p className={finding.severity === 'BREACH' ? 'font-semibold text-[#9b2f28]' : finding.severity === 'WATCH' ? 'font-semibold text-[#80611a]' : 'font-semibold text-[#1f5d42]'}>
                  Red team: {finding.finding}
                </p>
                <p className="mt-0.5 text-brand-muted">{finding.action}</p>
              </div>
            ))}
          </div>
          {recommendedExceedsCap && (
            <p className="mt-3 rounded-md bg-[#fbebea] px-2.5 py-2 text-xs font-semibold text-[#9b2f28]">
              Automatic rate exceeds the fund rate cap of {rateCap.toFixed(2)}%. Reduce the amount, term, or borrower risk before originating.
            </p>
          )}
        </div>
      )}

      {!pricingContext.tbill91Rate && (
        <div className="rounded-md border border-brand-line bg-white px-3 py-2 text-xs text-brand-muted">
          T-Bill benchmark is TBC. Add a T-Bill holding with a return rate before originating loans, because LEJ must price every loan against the safer option.
        </div>
      )}

      <input type="hidden" name="fundingCycleId" value={cycles[0]?.id ?? ''} />
      <input type="hidden" name="interestMethod" value="REDUCING_BALANCE" />
      <input type="hidden" name="originationFee" value="0.00" />
      <input type="hidden" name="originationFeeMethod" value="DEDUCT_FROM_DISBURSEMENT" />
      <input type="hidden" name="repaymentAllocOrder" value="FEES_INTEREST_PRINCIPAL" />

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Principal (GHS)"
          name="principal"
          type="number"
          step="0.01"
          required
          value={principal}
          onChange={setPrincipal}
          error={errors.principal ?? undefined}
          placeholder="0.00"
        />
        <div className="rounded-lg border border-brand-line bg-brand-panel p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Interest rate</p>
          <p className="mt-2 text-2xl font-semibold text-brand-black">{pricing ? `${pricing.recommended.toFixed(2)}%` : 'TBC'}</p>
          <p className="mt-1 text-xs leading-5 text-brand-muted">
            Calculated by LEJ from amount, term, borrower risk, PCR, loan-book stress, and T-Bill opportunity cost.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Disbursement date"
          name="disbursementDate"
          type="date"
          required
          value={disbursementDate}
          onChange={setDisbursementDate}
          error={errors.disbursementDate ?? undefined}
        />
        <FormField
          label="Final repayment date"
          name="repaymentDate"
          type="date"
          required
          value={repaymentDate}
          onChange={setRepaymentDate}
          error={errors.repaymentDate ?? undefined}
        />
      </div>
      <p className="rounded-md border border-brand-line bg-brand-panel px-3 py-2 text-xs text-brand-muted">The system uses reducing-balance payments, a zero origination fee, fees → interest → principal allocation, and the active cycle. It derives the term from your final repayment date and generates the full schedule automatically.</p>

      <button type="submit" disabled={pending || !pricing || recommendedExceedsCap} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Originating...' : 'Originate loan'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Origination activates the loan with LEJ&apos;s automatic rate and writes the full amortization schedule to the loan book.</p>
    </form>
  );
}
