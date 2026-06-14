'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { captureDashboardSnapshot } from '@/app/actions/reports';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

export function SnapshotForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      snapshotDate: validateField(form.get('snapshotDate') as string, { required: 'Snapshot date is required' }),
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
    const result = await captureDashboardSnapshot(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      router.refresh();
      toast({ tone: 'success', title: 'Snapshot captured', message: 'Dashboard metrics were frozen for reporting and audit.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to capture snapshot.';
      setServerError(message);
      toast({ tone: 'error', title: 'Snapshot failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Snapshot captured.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Snapshot date" name="snapshotDate" type="date" required error={errors.snapshotDate ?? undefined} />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Capturing...' : 'Capture dashboard snapshot'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Snapshot values are frozen from the current dashboard metrics and audit logged.</p>
    </form>
  );
}
