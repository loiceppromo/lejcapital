'use client';

import { useState } from 'react';
import {
  LEDGER_ACCOUNTS,
  LEDGER_SOURCES,
  validateLedgerEntry,
  type LedgerEntryInput,
  type LedgerValidationError,
} from '@/lib/fund/ledger';
import { FormField } from './form-field';
import { useToast } from './toast';

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
  const toast = useToast();

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
      const message = err instanceof Error ? err.message : 'Ledger entry could not be saved.';
      setSubmitError(message);
      toast({ tone: 'error', title: 'Ledger entry failed', message });
      return;
    }
    setSubmitting(false);

    if (result && !result.ok) {
      const message = result.error ?? 'Ledger entry could not be saved.';
      setSubmitError(message);
      toast({ tone: 'error', title: 'Ledger entry failed', message });
      return;
    }

    setForm(emptyForm);
    setSubmitted(true);
    toast({ tone: 'success', title: 'Ledger entry added', message: 'The entry was persisted and audit-logged.' });
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

      <FormField
        label="Date"
        name="date"
        type="date"
        value={form.date}
        required
        error={fieldError('date')}
        onChange={(value) => update('date', value)}
      />

      <FormField
        label="Account"
        name="account"
        type="select"
        value={form.account}
        required
        error={fieldError('account')}
        options={LEDGER_ACCOUNTS.map((account) => ({ value: account, label: account }))}
        onChange={(value) => update('account', value)}
      />

      <FormField
        label="Description"
        name="description"
        value={form.description}
        required
        error={fieldError('description')}
        placeholder="What is this entry for?"
        onChange={(value) => update('description', value)}
      />

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

      <FormField
        label="Amount (GHS)"
        name="amount"
        value={form.amount}
        required
        error={fieldError('amount')}
        placeholder="0.00"
        onChange={(value) => update('amount', value)}
      />

      <FormField
        label="Source"
        name="source"
        type="select"
        value={form.source}
        required
        error={fieldError('source')}
        options={LEDGER_SOURCES.map((source) => ({ value: source, label: source }))}
        onChange={(value) => update('source', value)}
      />

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
