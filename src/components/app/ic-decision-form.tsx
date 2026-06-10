'use client';

import { useState } from 'react';
import { recordICDecision } from '@/app/actions/governance';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };

export function ICDecisionForm({ cycles }: { cycles: SelectOption[] }) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
      position: validateField(form.get('position') as string, { required: 'Position is required' }),
      decision: validateField(form.get('decision') as string, { required: 'Select a decision' }),
      rationale: validateField(form.get('rationale') as string, { required: 'Rationale is required', minLength: 10 }),
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
    const result = await recordICDecision(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'IC decision recorded', message: 'Decision and rationale were saved for governance review.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to record IC decision.';
      setServerError(message);
      toast({ tone: 'error', title: 'IC decision failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">IC decision recorded.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />
      <FormField label="Position" name="position" required error={errors.position ?? undefined}
        placeholder="UNDC, AFH, GSE, T-Bills/Cash, Loans" />
      <FormField label="Decision" name="decision" type="select" required error={errors.decision ?? undefined}
        options={[
          { value: 'INCREASE', label: 'Increase' },
          { value: 'MAINTAIN', label: 'Maintain' },
          { value: 'REDUCE', label: 'Reduce' },
          { value: 'EXIT', label: 'Exit' },
        ]}
        placeholder="Select decision"
      />
      <FormField label="Rationale" name="rationale" type="textarea" required error={errors.rationale ?? undefined}
        rows={5} hint="Minimum 10 characters — explain the reasoning for this decision" />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Recording...' : 'Record IC decision'}
      </button>
    </form>
  );
}
