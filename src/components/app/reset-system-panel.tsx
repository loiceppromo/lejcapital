'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { resetOperationalSystem } from '@/app/actions/system';
import { useToast } from './toast';

const RESET_PHRASE = 'RESET LEJ CAPITAL';
const WAIT_SECONDS = 30;

export function ResetSystemPanel({ dbConnected }: { dbConnected: boolean }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(WAIT_SECONDS);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(Math.max(0, WAIT_SECONDS - elapsedSeconds));
    }, 250);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const ready = useMemo(
    () => dbConnected && startedAt !== null && remaining === 0 && confirmation.trim() === RESET_PHRASE,
    [confirmation, dbConnected, remaining, startedAt],
  );

  function startCountdown() {
    setStartedAt(Date.now());
    setRemaining(WAIT_SECONDS);
    setConfirmation('');
    setError('');
  }

  function submitReset() {
    if (!startedAt || !ready) return;
    const formData = new FormData();
    formData.set('startedAt', String(startedAt));
    formData.set('confirmation', confirmation);

    startTransition(async () => {
      const result = await resetOperationalSystem(formData);
      if (result.ok) {
        toast({
          tone: 'success',
          title: 'System reset completed',
          message: 'Operational records were cleared. Users and audit logs were preserved.',
        });
        setStartedAt(null);
        setRemaining(WAIT_SECONDS);
        setConfirmation('');
        setError('');
      } else {
        const message = result.error ?? 'Reset failed.';
        setError(message);
        toast({ tone: 'error', title: 'Reset blocked', message });
      }
    });
  }

  return (
    <div className="rounded-md border border-[#e6b8b3] bg-[#fff7f6] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#7f241d]">Reset operational system</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#8d514c]">
            Clears cycles, sleeves, investors, borrowers, loans, market holdings, ledger entries,
            reports, notifications, and operating businesses. Users, market assumptions, regime
            settings, and audit logs are preserved.
          </p>
        </div>
        <button
          type="button"
          onClick={startCountdown}
          disabled={!dbConnected || isPending}
          className="rounded-md border border-[#c55249] px-3 py-2 text-sm font-semibold text-[#7f241d] hover:bg-[#fbe9e7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start 30-second countdown
        </button>
      </div>

      {!dbConnected && (
        <p className="mt-3 rounded-md border border-brand-line bg-white px-3 py-2 text-sm text-brand-muted">
          Database is not connected. Seed mode data cannot be reset from this control.
        </p>
      )}

      {startedAt && (
        <div className="mt-4 grid gap-3 lg:grid-cols-[12rem_1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-[#7f241d]">Safety timer</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-brand-black">
              {remaining === 0 ? 'Ready' : `${remaining}s`}
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-brand-charcoal">
              Type {RESET_PHRASE}
            </span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-1 block w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-[#c55249] focus:ring-2 focus:ring-[#c55249]/10"
              placeholder={RESET_PHRASE}
            />
          </label>
          <button
            type="button"
            disabled={!ready || isPending}
            onClick={submitReset}
            className="rounded-md bg-[#9b2f28] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#7f241d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Resetting...' : 'Reset system'}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-[#e6b8b3] bg-white px-3 py-2 text-sm font-medium text-[#7f241d]">
          {error}
        </p>
      )}
    </div>
  );
}
