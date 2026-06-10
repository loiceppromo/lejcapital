'use client';

import { useState } from 'react';
import {
  LEDGER_ACCOUNTS,
  LEDGER_SOURCES,
  validateLedgerEntry,
  type LedgerEntryInput,
  type LedgerValidationError,
} from '@/lib/fund/ledger';

interface LedgerFormProps {
  onSubmit: (input: LedgerEntryInput) => Promise<{ ok: boolean; error?: string } | void> | { ok: boolean; error?: string } | void;
}

const emptyForm: LedgerEntryInput = {
  date: new Date().toISOString().slice(0, 10),
  account: LEDGER_ACCOUNTS[0],
  description: '',
  direction: 'IN',
  amount: '',
  source: 'Manual',
};

export function LedgerForm({ onSubmit }: LedgerFormProps) {
  const [form, setForm] = useState<LedgerEntryInput>(emptyForm);
  const [errors, setErrors] = useState<LedgerValidationError[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function fieldError(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const validationErrors = validateLedgerEntry(form);
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    setSubmitting(true);
    let result: { ok: boolean; error?: string } | void;
    try {
      result = await onSubmit(form);
    } catch (err) {
      setSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : 'Ledger entry could not be saved.');
      return;
    }
    setSubmitting(false);

    if (result && !result.ok) {
      setSubmitError(result.error ?? 'Ledger entry could not be saved.');
      return;
    }

    setForm(emptyForm);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  }

  function update(field: keyof LedgerEntryInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors((prev) => prev.filter((e) => e.field !== field));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitted && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          Entry added to ledger.
        </div>
      )}
      {submitError && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200">
          {submitError}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => update('date', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
        />
        {fieldError('date') && <p className="mt-1 text-xs text-red-600">{fieldError('date')}</p>}
      </div>

      {/* Account */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Account</label>
        <select
          value={form.account}
          onChange={(e) => update('account', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
        >
          {LEDGER_ACCOUNTS.map((acc) => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>
        {fieldError('account') && <p className="mt-1 text-xs text-red-600">{fieldError('account')}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="What is this entry for?"
          className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
        />
        {fieldError('description') && <p className="mt-1 text-xs text-red-600">{fieldError('description')}</p>}
      </div>

      {/* Direction */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Direction</label>
        <div className="mt-1 flex gap-2">
          {(['IN', 'OUT'] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => update('direction', dir)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                form.direction === dir
                  ? dir === 'IN'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-red-300 bg-red-50 text-red-800'
                  : 'border-brand-silver text-brand-muted hover:border-brand-charcoal'
              }`}
            >
              {dir === 'IN' ? 'Cash In' : 'Cash Out'}
            </button>
          ))}
        </div>
        {fieldError('direction') && <p className="mt-1 text-xs text-red-600">{fieldError('direction')}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Amount (GHS)</label>
        <input
          type="text"
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => update('amount', e.target.value)}
          placeholder="0.00"
          className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm font-mono focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
        />
        {fieldError('amount') && <p className="mt-1 text-xs text-red-600">{fieldError('amount')}</p>}
      </div>

      {/* Source */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-muted">Source</label>
        <select
          value={form.source}
          onChange={(e) => update('source', e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-silver px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
        >
          {LEDGER_SOURCES.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
        {fieldError('source') && <p className="mt-1 text-xs text-red-600">{fieldError('source')}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2"
      >
        {submitting ? 'Saving...' : 'Add entry'}
      </button>

      <p className="text-xs text-brand-muted">
        Entries are append-only. Corrections are new entries, never silent edits.
      </p>
    </form>
  );
}
