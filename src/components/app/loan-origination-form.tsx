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
  const [interestRate, setInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('6');
  const toast = useToast();

  const selectedBorrower = borrowers.find((borrower) => borrower.id === borrowerId);
  const pricing = useMemo(() => {
    if (!pricingContext.tbill91Rate || !principal || !termMonths) return null;
    try {
      const principalAmount = new Decimal(principal || 0);
      const term = Number.parseInt(termMonths, 10);
      if (!principalAmount.isFinite() || principalAmount.lte(0) || !Number.isFinite(term) || term <= 0) return null;
      return computeRecommendedRate({
        principal: principalAmount,
        termMonths: term,
        riskGrade: selectedBorrower?.riskGrade ?? 'C',
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
  }, [pricingContext, principal, selectedBorrower, termMonths]);

  const enteredRate = useMemo(() => {
    if (!interestRate) return null;
    try {
      return new Decimal(interestRate);
    } catch {
      return null;
    }
  }, [interestRate]);
  const belowFloor = pricing && enteredRate ? enteredRate.lt(pricing.floor) : false;
  const rateCap = new Decimal(pricingContext.loanRateCap || '60');
  const aboveCap = enteredRate ? enteredRate.gt(rateCap) : false;

  function formatMoney(value: Decimal): string {
    return `GHS ${value.toNumber().toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

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
      router.refresh();
      toast({ tone: 'success', title: 'Loan originated', message: 'Schedule, loan book, ledger, and audit records were updated.' });
      (e.target as HTMLFormElement).reset();
      setBorrowerId('');
      setPrincipal('');
      setInterestRate('');
      setTermMonths('6');
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
            <button
              type="button"
              onClick={() => setInterestRate(pricing.recommended.toFixed(2))}
              className="rounded-md bg-brand-navy px-3 py-2 text-xs font-semibold text-white hover:bg-brand-navy-dark"
            >
              Use rate
            </button>
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
          {belowFloor && (
            <p className="mt-3 rounded-md bg-[#fbebea] px-2.5 py-2 text-xs font-semibold text-[#9b2f28]">
              Entered rate is below the minimum viable floor. IC approval should be required before originating.
            </p>
          )}
          {aboveCap && (
            <p className="mt-3 rounded-md bg-[#fbebea] px-2.5 py-2 text-xs font-semibold text-[#9b2f28]">
              Entered rate exceeds the fund rate cap of {rateCap.toFixed(2)}%. Reduce the rate or request an IC exception.
            </p>
          )}
        </div>
      )}

      {!pricingContext.tbill91Rate && (
        <div className="rounded-md border border-brand-line bg-white px-3 py-2 text-xs text-brand-muted">
          T-Bill benchmark is TBC. Add a T-Bill holding with a return rate before relying on automatic pricing.
        </div>
      )}

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
          value={principal}
          onChange={setPrincipal}
          error={errors.principal ?? undefined}
          placeholder="0.00"
        />
        <FormField
          label="Interest rate (%)"
          name="interestRate"
          type="number"
          step="0.01"
          required
          value={interestRate}
          onChange={setInterestRate}
          error={errors.interestRate ?? undefined}
          placeholder="e.g. 24"
          hint={pricing ? `Annual rate. Recommended: ${pricing.recommended.toFixed(2)}%.` : 'Annual rate'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Term (months)"
          name="termMonths"
          type="number"
          required
          value={termMonths}
          onChange={setTermMonths}
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
