'use client';

import { useState, useMemo } from 'react';
import {
  addInvestor,
  addInvestorCycle,
  recordContribution,
  recordInvestorRepayment,
  processReinvestment,
  updateGiftStatus,
} from '@/app/actions/investors';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type Tab = 'investor' | 'contribution' | 'repayment' | 'reinvestment' | 'gift';
type SelectOption = { id: string; label: string };

interface TierInfo {
  tier: string;
  rate: number;
  giftTier: string;
}

function getTierInfo(amount: number): TierInfo | null {
  if (amount < 3500) return null;
  if (amount < 6000) return { tier: 'Starter', rate: 0.06, giftTier: 'Not eligible' };
  if (amount < 10000) return { tier: 'Growth', rate: 0.07, giftTier: 'Not eligible' };
  if (amount < 15000) return { tier: 'Premium', rate: 0.08, giftTier: 'Standard' };
  if (amount < 22500) return { tier: 'Executive', rate: 0.09, giftTier: 'Premium' };
  return { tier: 'Elite', rate: 0.095, giftTier: 'Executive' };
}

export function InvestorActionsForm({
  investors,
  cycles,
  investorCycles,
}: {
  investors: SelectOption[];
  cycles: SelectOption[];
  investorCycles?: { id: string; investorId: string; label: string }[];
}) {
  const [tab, setTab] = useState<Tab>('investor');
  const tabs: [Tab, string][] = [
    ['investor', 'New partner'],
    ['contribution', 'Contribution'],
    ['repayment', 'Repayment'],
    ['reinvestment', 'Reinvestment'],
    ['gift', 'Gifts'],
  ];

  return (
    <div>
      <div className="flex gap-1 rounded-md border border-brand-line bg-brand-panel p-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold ${tab === key ? 'bg-white text-brand-black shadow-sm' : 'text-brand-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 'investor' && <AddInvestorForm cycles={cycles} />}
        {tab === 'contribution' && <ContributionForm investors={investors} cycles={cycles} />}
        {tab === 'repayment' && <RepaymentForm investors={investors} cycles={cycles} />}
        {tab === 'reinvestment' && <ReinvestmentForm investorCycles={investorCycles ?? []} />}
        {tab === 'gift' && <GiftForm investorCycles={investorCycles ?? []} />}
      </div>
    </div>
  );
}

function AddInvestorForm({ cycles }: { cycles: SelectOption[] }) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const toast = useToast();

  const tierInfo = useMemo(() => {
    const n = Number(investmentAmount);
    if (!n || n < 3500) return null;
    return getTierInfo(n);
  }, [investmentAmount]);

  const preferredReturn = useMemo(() => {
    if (!tierInfo) return null;
    const n = Number(investmentAmount);
    return n * tierInfo.rate;
  }, [investmentAmount, tierInfo]);

  const finalPayout = useMemo(() => {
    if (!preferredReturn) return null;
    return Number(investmentAmount) + preferredReturn;
  }, [investmentAmount, preferredReturn]);

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      name: validateField(form.get('name') as string, { required: 'Partner name is required', minLength: 2 }),
      email: validateField(form.get('email') as string, {
        pattern: { regex: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
      }),
      investmentAmount: validateField(form.get('investmentAmount') as string, { required: 'Capital amount is required', min: 3500 }),
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
    };
    if (Number(form.get('investmentAmount')) < 3500) {
      e.investmentAmount = 'Minimum contribution is GHS 3,500';
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
    const result = await addInvestor(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      setInvestmentAmount('');
      toast({ tone: 'success', title: 'Capital partner added', message: `${tierInfo?.tier} package — GHS ${preferredReturn?.toFixed(2)} preferred return per cycle.` });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to save capital partner.';
      setServerError(message);
      toast({ tone: 'error', title: 'Partner was not added', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={serverError} successText="Capital partner added successfully." />
      <FormField label="Full name" name="name" required error={errors.name ?? undefined} placeholder="Full name" />
      <FormField label="Email" name="email" type="email" error={errors.email ?? undefined} placeholder="email@example.com" />
      <FormField label="Phone" name="phone" placeholder="+233 XX XXX XXXX" />

      <div className="rounded-lg border border-brand-line bg-brand-panel/50 p-3 space-y-3">
        <p className="text-xs font-semibold text-brand-charcoal">Capital contribution details</p>
        <FormField
          label="Capital amount (GHS)"
          name="investmentAmount"
          type="number"
          step="0.01"
          min="3500"
          required
          error={errors.investmentAmount ?? undefined}
          placeholder="Minimum GHS 3,500 contribution"
          onChange={setInvestmentAmount}
        />
        <FormField
          label="Deployment cycle"
          name="cycleId"
          type="select"
          required
          error={errors.cycleId ?? undefined}
          options={cycles.map((c) => ({ value: c.id, label: c.label }))}
          placeholder="Select cycle"
        />

        {tierInfo && (
          <div className="rounded-md border border-green-200 bg-green-50/60 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-green-800">Auto-calculated package</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-brand-muted">Package tier</span>
              <span className="font-semibold text-brand-charcoal">{tierInfo.tier}</span>
              <span className="text-brand-muted">Cycle return rate</span>
              <span className="font-semibold text-brand-charcoal">{(tierInfo.rate * 100).toFixed(1)}%</span>
              <span className="text-brand-muted">Preferred return</span>
              <span className="font-semibold text-green-700">GHS {preferredReturn?.toFixed(2)}</span>
              <span className="text-brand-muted">Final payout</span>
              <span className="font-semibold text-green-700">GHS {finalPayout?.toFixed(2)}</span>
              <span className="text-brand-muted">Gift eligibility</span>
              <span className="font-semibold text-brand-charcoal">{tierInfo.giftTier}</span>
            </div>
          </div>
        )}
        {investmentAmount && Number(investmentAmount) > 0 && Number(investmentAmount) < 3500 && (
          <p className="text-xs text-amber-600 font-medium">Minimum capital contribution is GHS 3,500.</p>
        )}
      </div>

      <FormField label="Notes" name="notes" type="textarea" rows={2} placeholder="Optional internal notes" />
      <Btn pending={pending} label="Add capital partner" />
    </form>
  );
}

function ReinvestmentForm({ investorCycles }: { investorCycles: { id: string; investorId: string; label: string }[] }) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [preference, setPreference] = useState('');
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      investorCycleId: validateField(form.get('investorCycleId') as string, { required: 'Select a capital cycle' }),
      payoutPreference: validateField(form.get('payoutPreference') as string, { required: 'Select a payout preference' }),
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
    const result = await processReinvestment(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      setPreference('');
      toast({ tone: 'success', title: 'Reinvestment processed', message: 'Cycle payout preference saved.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Reinvestment failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={serverError} successText="Reinvestment processed." />
      <FormField
        label="Capital cycle"
        name="investorCycleId"
        type="select"
        required
        error={errors.investorCycleId ?? undefined}
        options={investorCycles.map((ic) => ({ value: ic.id, label: ic.label }))}
        placeholder="Select capital cycle"
      />
      <FormField
        label="Payout preference"
        name="payoutPreference"
        type="select"
        required
        error={errors.payoutPreference ?? undefined}
        options={[
          { value: 'FULL_PAYOUT', label: 'Full payout (principal + preferred return)' },
          { value: 'FULL_REINVESTMENT', label: 'Full reinvestment (roll everything into next cycle)' },
          { value: 'PRINCIPAL_REINVESTMENT', label: 'Principal reinvestment (receive return, reinvest principal)' },
          { value: 'CUSTOM', label: 'Custom split' },
        ]}
        placeholder="Select preference"
        onChange={setPreference}
      />
      {preference === 'CUSTOM' && (
        <FormField
          label="Reinvestment percentage"
          name="customPercent"
          type="number"
          min="1"
          max="99"
          step="1"
          placeholder="e.g. 70"
          hint="Percentage of total (principal + return) to reinvest"
        />
      )}
      <Btn pending={pending} label="Process reinvestment" />
    </form>
  );
}

function GiftForm({ investorCycles }: { investorCycles: { id: string; investorId: string; label: string }[] }) {
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!formData.get('investorCycleId') || !formData.get('giftStatus')) return;

    setPending(true);
    setServerError('');
    const result = await updateGiftStatus(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      toast({ tone: 'success', title: 'Gift status updated', message: 'Gift tracking record saved.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Gift update failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={serverError} successText="Gift status updated." />
      <FormField
        label="Capital cycle"
        name="investorCycleId"
        type="select"
        required
        options={investorCycles.map((ic) => ({ value: ic.id, label: ic.label }))}
        placeholder="Select capital cycle"
      />
      <FormField
        label="Gift status"
        name="giftStatus"
        type="select"
        required
        options={[
          { value: 'DUE', label: 'Due' },
          { value: 'SELECTED', label: 'Selected' },
          { value: 'PACKED', label: 'Packed' },
          { value: 'DELIVERED', label: 'Delivered' },
        ]}
        placeholder="Select status"
      />
      <FormField label="Gift selected" name="giftSelected" placeholder="e.g. Gift hamper, Tech accessory" />
      <FormField label="Gift notes" name="giftNotes" type="textarea" rows={2} placeholder="Delivery notes, preferences, etc." />
      <Btn pending={pending} label="Update gift status" />
    </form>
  );
}

function ContributionForm({ investors, cycles }: { investors: SelectOption[]; cycles: SelectOption[] }) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      investorId: validateField(form.get('investorId') as string, { required: 'Select a capital partner' }),
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
      amount: validateField(form.get('amount') as string, { required: 'Amount is required', min: 0.01 }),
      dateReceived: validateField(form.get('dateReceived') as string, { required: 'Date is required' }),
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
    const result = await recordContribution(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'Capital recorded', message: 'Capital placed, ledger, and audit records updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Failed to record capital', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={serverError} successText="Capital recorded." />
      <FormField label="Capital partner" name="investorId" type="select" required error={errors.investorId ?? undefined}
        options={investors.map((i) => ({ value: i.id, label: i.label }))} placeholder="Select partner" />
      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />
      <FormField label="Amount (GHS)" name="amount" type="number" step="0.01" required error={errors.amount ?? undefined} placeholder="0.00" />
      <FormField label="Date received" name="dateReceived" type="date" required error={errors.dateReceived ?? undefined} />
      <Btn pending={pending} label="Record capital" />
    </form>
  );
}

function RepaymentForm({ investors, cycles }: { investors: SelectOption[]; cycles: SelectOption[] }) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      investorId: validateField(form.get('investorId') as string, { required: 'Select a capital partner' }),
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
      principalDue: validateField(form.get('principalDue') as string, { required: 'Principal due is required', min: 0 }),
      amountRepaid: validateField(form.get('amountRepaid') as string, { required: 'Repayment amount is required', min: 0.01 }),
      repaymentDate: validateField(form.get('repaymentDate') as string, { required: 'Date is required' }),
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
    const result = await recordInvestorRepayment(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'Payout recorded', message: 'Payout, ledger, and audit records updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Payout recording failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={serverError} successText="Payout recorded." />
      <FormField label="Capital partner" name="investorId" type="select" required error={errors.investorId ?? undefined}
        options={investors.map((i) => ({ value: i.id, label: i.label }))} placeholder="Select partner" />
      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />
      <p className="text-xs leading-5 text-brand-muted">Payouts are append-only and should match the cycle close record.</p>
      <FormField label="Capital due (GHS)" name="principalDue" type="number" step="0.01" required error={errors.principalDue ?? undefined} placeholder="0.00" />
      <FormField label="Amount paid (GHS)" name="amountRepaid" type="number" step="0.01" required error={errors.amountRepaid ?? undefined} placeholder="0.00" />
      <FormField label="Payout date" name="repaymentDate" type="date" required error={errors.repaymentDate ?? undefined} />
      <Btn pending={pending} label="Record payout" />
    </form>
  );
}

function Btn({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
      {pending ? 'Saving...' : label}
    </button>
  );
}

function Msg({ success, error, successText }: { success: boolean; error: string; successText: string }) {
  return (
    <>
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">{successText}</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}
    </>
  );
}
