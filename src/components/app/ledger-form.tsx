'use client';

import { useState } from 'react';
import {
  validateLedgerEntry,
  type LedgerEntryInput,
  type LedgerValidationError,
} from '@/lib/fund/ledger';
import { FormField } from './form-field';
import { useToast } from './toast';

interface LedgerFormProps {
  onSubmit: (input: LedgerEntryInput) => Promise<{ ok: boolean; error?: string } | void> | { ok: boolean; error?: string } | void;
}

/**
 * Workflow A — record a cash movement. Keep this intentionally short: the
 * manager chooses the money direction and one deployment destination.
 */
const DESTINATIONS = ['Businesses', 'T-Bills', 'Stocks'] as const;

const today = () => new Date().toISOString().slice(0, 10);

export function LedgerForm({ onSubmit }: LedgerFormProps) {
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState<(typeof DESTINATIONS)[number]>('Businesses');
  const [note, setNote] = useState('');

  const [errors, setErrors] = useState<LedgerValidationError[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const fieldError = (field: string) => errors.find((e) => e.field === field)?.message;

  function buildInput(): LedgerEntryInput {
    const description = note.trim() || `${direction === 'IN' ? 'Cash received' : 'Cash paid'} — ${destination}`;
    return { date, account: destination, description, direction, amount, source: 'Manual' };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const input = buildInput();
    const validationErrors = validateLedgerEntry(input);
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    setSubmitting(true);
    let result: { ok: boolean; error?: string } | void;
    try {
      result = await onSubmit(input);
    } catch (err) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : 'Cash event could not be recorded.';
      setSubmitError(message);
      toast({ tone: 'error', title: 'Could not record cash event', message });
      return;
    }
    setSubmitting(false);
    if (result && !result.ok) {
      const message = result.error ?? 'Cash event could not be recorded.';
      setSubmitError(message);
      toast({ tone: 'error', title: 'Could not record cash event', message });
      return;
    }

    setAmount(''); setNote(''); setDate(today());
    setSubmitted(true);
    toast({
      tone: 'success',
      title: direction === 'IN' ? 'Cash received recorded' : 'Cash paid recorded',
      message: direction === 'IN' ? 'Analyse it in the Decision Centre to get an allocation recommendation.' : 'The entry was persisted and audit-logged.',
    });
    setTimeout(() => setSubmitted(false), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitted && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          Cash event recorded.
        </div>
      )}
      {submitError && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200">{submitError}</div>
      )}

      {/* Cash direction */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Cash direction</label>
        <div className="mt-1 flex gap-2">
          {(['IN', 'OUT'] as const).map((dir) => (
            <button
              key={dir} type="button" onClick={() => setDirection(dir)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                direction === dir
                  ? dir === 'IN' ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'
                  : 'border-brand-silver text-brand-muted hover:border-brand-charcoal'
              }`}
            >
              {dir === 'IN' ? 'Cash received' : 'Cash paid'}
            </button>
          ))}
        </div>
      </div>

      <FormField label="Date" name="date" type="date" value={date} required error={fieldError('date')} onChange={setDate} />
      <FormField label="Amount (GHS)" name="amount" value={amount} required error={fieldError('amount')} placeholder="0.00" onChange={setAmount} />

      <FormField
        label={direction === 'IN' ? 'Money received through' : 'Money paid to'}
        name="destination"
        type="select"
        value={destination}
        required
        options={DESTINATIONS.map((value) => ({ value, label: value }))}
        onChange={(value) => setDestination(value as (typeof DESTINATIONS)[number])}
      />

      <FormField label="Note (optional)" name="note" value={note} placeholder="Short factual note" onChange={setNote} />

      <button type="submit" disabled={submitting}
        className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2">
        {submitting ? 'Saving…' : direction === 'IN' ? 'Record cash received' : 'Record cash paid'}
      </button>

      <p className="text-xs text-brand-muted">
        This records the cash movement only. Use the Decision Centre when you want an allocation recommendation before deploying capital.
      </p>
    </form>
  );
}
