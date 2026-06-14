'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateMarketPolicy } from '@/app/actions/market-policy';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };

export function MarketPolicyForm({ cycles }: { cycles: SelectOption[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
      requestedRegime: validateField(form.get('requestedRegime') as string, { required: 'Select a regime' }),
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
    const result = await updateMarketPolicy(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      router.refresh();
      toast({ tone: 'success', title: 'Market policy updated', message: 'Regime request and gate evidence were saved.' });
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to update market policy.';
      setServerError(message);
      toast({ tone: 'error', title: 'Market policy failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Market policy updated.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />
      <FormField label="Requested regime" name="requestedRegime" type="select" required error={errors.requestedRegime ?? undefined}
        options={[
          { value: 'DEFENSIVE', label: 'Defensive' },
          { value: 'NORMAL', label: 'Normal' },
          { value: 'OPPORTUNISTIC', label: 'Opportunistic' },
        ]}
      />

      <div className="rounded-md border border-brand-line p-3">
        <div className="mb-3 text-[11px] font-semibold uppercase text-brand-muted">Opportunistic gate evidence</div>
        <Check name="undcDemandValidated" label="UNDC demand validated" />
        <FormField label="UNDC demand rationale" name="undcDemandRationale" type="textarea" rows={2} />
        <Check name="marketCatalystDocumented" label="Documented market catalyst" />
        <FormField label="Market catalyst rationale" name="marketCatalystRationale" type="textarea" rows={2} />
        <Check name="noOpenOperationalIssues" label="No open operational issues" />
        <FormField label="Operational clearance rationale" name="operationalRationale" type="textarea" rows={2} />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Saving...' : 'Update market policy'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">PCR &gt;= 1.25x is derived automatically. If Opportunistic gates fail, the finance engine downgrades the effective regime.</p>
    </form>
  );
}

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="mb-2 flex items-center gap-2 text-sm text-brand-black">
      <input name={name} type="checkbox" className="h-4 w-4 rounded border-brand-line text-brand-navy focus:ring-brand-navy" />
      <span>{label}</span>
    </label>
  );
}
