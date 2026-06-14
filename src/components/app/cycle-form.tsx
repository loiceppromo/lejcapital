'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCycle, sizeSleeves } from '@/app/actions/cycles';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type Tab = 'create' | 'sleeves';
type CycleOption = { id: string; label: string };

export function CycleActionsForm({ cycles }: { cycles: CycleOption[] }) {
  const [tab, setTab] = useState<Tab>('create');

  return (
    <div>
      <div className="flex gap-1 rounded-md border border-brand-line bg-brand-panel p-1">
        {([['create', 'New cycle'], ['sleeves', 'Size sleeves']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold ${tab === key ? 'bg-white text-brand-black shadow-sm' : 'text-brand-muted hover:text-brand-black'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 'create' && <CreateCycleForm />}
        {tab === 'sleeves' && <SizeSleeveForm cycles={cycles} />}
      </div>
    </div>
  );
}

function CreateCycleForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      sequenceNo: validateField(form.get('sequenceNo') as string, { required: 'Sequence number is required', min: 1 }),
      startDate: validateField(form.get('startDate') as string, { required: 'Start date is required' }),
      endDate: validateField(form.get('endDate') as string, { required: 'End date is required' }),
      openingNAV: validateField(form.get('openingNAV') as string, { min: 0 }),
    };
    // Cross-field: end date must be after start date
    const start = form.get('startDate') as string;
    const end = form.get('endDate') as string;
    if (start && end && end <= start) {
      e.endDate = 'End date must be after start date';
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
    const result = await createCycle(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      router.refresh();
      toast({ tone: 'success', title: 'Cycle created', message: 'New cycle is in Planning status.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Cycle was not created', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Cycle created in Planning status.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Sequence number" name="sequenceNo" type="number" required error={errors.sequenceNo ?? undefined} placeholder="e.g. 2" min={1} />

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start date" name="startDate" type="date" required error={errors.startDate ?? undefined} />
        <FormField label="End date" name="endDate" type="date" required error={errors.endDate ?? undefined} />
      </div>

      <FormField label="Opening NAV (GHS)" name="openingNAV" type="number" step="0.01" error={errors.openingNAV ?? undefined} placeholder="Optional" hint="Leave blank if not yet confirmed" />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Creating...' : 'Create cycle'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Creates a cycle in Planning. Transition to Active only after funding is confirmed.</p>
    </form>
  );
}

function SizeSleeveForm({ cycles }: { cycles: CycleOption[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
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
    const result = await sizeSleeves(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      router.refresh();
      toast({ tone: 'success', title: 'Sleeves sized', message: 'Cycle sleeve targets and funded amounts were updated.' });
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Sleeve sizing failed', message });
    }
  }

  const sleeves = [
    ['protection', 'Protection'],
    ['operatingAlpha', 'Operating Alpha'],
    ['marketAlpha', 'Market Alpha'],
    ['reserve', 'Reserve'],
    ['loanBook', 'Loan Book'],
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Sleeves sized.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />

      {sleeves.map(([name, label]) => (
        <FormField key={name} label={`${label} (GHS)`} name={name} type="number" step="0.01" placeholder="0.00" />
      ))}

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Sizing...' : 'Size sleeves'}
      </button>
    </form>
  );
}
