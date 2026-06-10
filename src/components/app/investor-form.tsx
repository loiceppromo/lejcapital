'use client';

import { useState } from 'react';
import { addInvestor, recordContribution, recordInvestorRepayment } from '@/app/actions/investors';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type Tab = 'investor' | 'contribution' | 'repayment';
type SelectOption = { id: string; label: string };

export function InvestorActionsForm({
  investors,
  cycles,
}: {
  investors: SelectOption[];
  cycles: SelectOption[];
}) {
  const [tab, setTab] = useState<Tab>('investor');

  return (
    <div>
      <div className="flex gap-1 rounded-md border border-brand-line bg-brand-panel p-1">
        {([['investor', 'Add investor'], ['contribution', 'Contribution'], ['repayment', 'Repayment']] as const).map(([key, label]) => (
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
        {tab === 'investor' && <AddInvestorForm />}
        {tab === 'contribution' && <ContributionForm investors={investors} cycles={cycles} />}
        {tab === 'repayment' && <RepaymentForm investors={investors} cycles={cycles} />}
      </div>
    </div>
  );
}

function AddInvestorForm() {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      name: validateField(form.get('name') as string, { required: 'Investor name is required', minLength: 2 }),
      email: validateField(form.get('email') as string, {
        pattern: { regex: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
      }),
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
    const result = await addInvestor(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'Investor added', message: 'Investor record is ready for contributions and statements.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Investor was not added', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={serverError} successText="Investor added." />
      <FormField label="Name" name="name" required error={errors.name ?? undefined} placeholder="Full name" />
      <FormField label="Email" name="email" type="email" error={errors.email ?? undefined} placeholder="investor@example.com" />
      <FormField label="Phone" name="phone" placeholder="+233 XX XXX XXXX" />
      <Btn pending={pending} label="Add investor" />
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
      investorId: validateField(form.get('investorId') as string, { required: 'Select an investor' }),
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
      amount: validateField(form.get('amount') as string, { required: 'Contribution amount is required', min: 0.01 }),
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
    const result = await recordContribution(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'Contribution recorded', message: 'Investor capital, ledger, and audit records were updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Contribution failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={serverError} successText="Contribution recorded." />
      <FormField label="Investor" name="investorId" type="select" required error={errors.investorId ?? undefined}
        options={investors.map((i) => ({ value: i.id, label: i.label }))} placeholder="Select investor" />
      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />
      <FormField label="Amount (GHS)" name="amount" type="number" step="0.01" required error={errors.amount ?? undefined} placeholder="0.00" />
      <FormField label="Date received" name="dateReceived" type="date" required error={errors.dateReceived ?? undefined} />
      <Btn pending={pending} label="Record contribution" />
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
      investorId: validateField(form.get('investorId') as string, { required: 'Select an investor' }),
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
      principalDue: validateField(form.get('principalDue') as string, { required: 'Principal due is required', min: 0 }),
      amountRepaid: validateField(form.get('amountRepaid') as string, { required: 'Repayment amount is required', min: 0.01 }),
      repaymentDate: validateField(form.get('repaymentDate') as string, { required: 'Repayment date is required' }),
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
      toast({ tone: 'success', title: 'Investor repayment recorded', message: 'Repayment, ledger, and audit records were updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Investor repayment failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={serverError} successText="Repayment recorded." />
      <FormField label="Investor" name="investorId" type="select" required error={errors.investorId ?? undefined}
        options={investors.map((i) => ({ value: i.id, label: i.label }))} placeholder="Select investor" />
      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />
      <p className="text-xs leading-5 text-brand-muted">Repayments are append-only and should match the cycle close record.</p>
      <FormField label="Principal due (GHS)" name="principalDue" type="number" step="0.01" required error={errors.principalDue ?? undefined} placeholder="0.00" />
      <FormField label="Amount repaid (GHS)" name="amountRepaid" type="number" step="0.01" required error={errors.amountRepaid ?? undefined} placeholder="0.00" />
      <FormField label="Repayment date" name="repaymentDate" type="date" required error={errors.repaymentDate ?? undefined} />
      <Btn pending={pending} label="Record repayment" />
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
