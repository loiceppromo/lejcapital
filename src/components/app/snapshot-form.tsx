'use client';

import { useState } from 'react';
import { captureDashboardSnapshot } from '@/app/actions/reports';
import { useToast } from './toast';

export function SnapshotForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await captureDashboardSnapshot(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      toast({ tone: 'success', title: 'Snapshot captured', message: 'Dashboard metrics were frozen for reporting and audit.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to capture snapshot.';
      setError(message);
      toast({ tone: 'error', title: 'Snapshot failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Snapshot captured.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Snapshot date</label>
        <input name="snapshotDate" type="date" required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Capturing...' : 'Capture dashboard snapshot'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Snapshot values are frozen from the current dashboard metrics and audit logged.</p>
    </form>
  );
}
