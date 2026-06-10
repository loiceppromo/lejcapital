'use client';

import { useState } from 'react';
import { addInvestor, recordContribution, recordInvestorRepayment } from '@/app/actions/investors';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError('');
    const result = await addInvestor(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) { setSuccess(true); (e.target as HTMLFormElement).reset(); setTimeout(() => setSuccess(false), 2500); }
    else setError(result.error ?? 'Failed.');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={error} successText="Investor added." />
      <Fld label="Name" name="name" required />
      <Fld label="Email" name="email" type="email" />
      <Fld label="Phone" name="phone" type="tel" />
      <Btn pending={pending} label="Add investor" />
    </form>
  );
}

function ContributionForm({ investors, cycles }: { investors: SelectOption[]; cycles: SelectOption[] }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError('');
    const result = await recordContribution(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) { setSuccess(true); (e.target as HTMLFormElement).reset(); setTimeout(() => setSuccess(false), 2500); }
    else setError(result.error ?? 'Failed.');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={error} successText="Contribution recorded." />
      <SelectFld label="Investor" name="investorId" options={investors} />
      <SelectFld label="Cycle" name="cycleId" options={cycles} />
      <Fld label="Amount (GHS)" name="amount" type="number" step="0.01" required />
      <Fld label="Date received" name="dateReceived" type="date" required />
      <Btn pending={pending} label="Record contribution" />
    </form>
  );
}

function RepaymentForm({ investors, cycles }: { investors: SelectOption[]; cycles: SelectOption[] }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError('');
    const result = await recordInvestorRepayment(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) { setSuccess(true); (e.target as HTMLFormElement).reset(); setTimeout(() => setSuccess(false), 2500); }
    else setError(result.error ?? 'Failed.');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Msg success={success} error={error} successText="Repayment recorded." />
      <SelectFld label="Investor" name="investorId" options={investors} />
      <SelectFld label="Cycle" name="cycleId" options={cycles} />
      <p className="text-xs leading-5 text-brand-muted">Repayments are append-only and should match the cycle close record.</p>
      <Fld label="Principal due (GHS)" name="principalDue" type="number" step="0.01" required />
      <Fld label="Amount repaid (GHS)" name="amountRepaid" type="number" step="0.01" required />
      <Fld label="Repayment date" name="repaymentDate" type="date" required />
      <Btn pending={pending} label="Record repayment" />
    </form>
  );
}

function SelectFld({ label, name, options }: { label: string; name: string; options: SelectOption[] }) {
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

function Fld({ label, name, type = 'text', required, placeholder, mono, step }: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string; mono?: boolean; step?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase text-brand-muted">{label}</label>
      <input name={name} type={type} step={step} required={required} placeholder={placeholder} className={`mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy ${mono ? 'font-mono' : ''}`} />
    </div>
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
