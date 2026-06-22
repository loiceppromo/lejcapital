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
 * Workflow A — record a CASH EVENT (what happened). The ledger captures facts,
 * never an allocation decision. For inflows the user states the source of funds;
 * the destination/allocation is decided separately in the Decision Centre.
 */
type SourceType =
  | 'BUSINESS_INCOME' | 'INVESTOR_CONTRIBUTION' | 'LOAN_REPAYMENT' | 'DIVIDEND'
  | 'TBILL_MATURITY' | 'STOCK_SALE' | 'FOUNDER_CONTRIBUTION' | 'OTHER';

const SOURCE_TYPES: { value: SourceType; label: string; account: string }[] = [
  { value: 'BUSINESS_INCOME', label: 'Business income', account: 'Operating income' },
  { value: 'INVESTOR_CONTRIBUTION', label: 'Capital partner contribution', account: 'Partner capital' },
  { value: 'LOAN_REPAYMENT', label: 'Loan repayment', account: 'Loan book' },
  { value: 'DIVIDEND', label: 'Dividend income', account: 'Market portfolio' },
  { value: 'TBILL_MATURITY', label: 'Treasury Bill maturity', account: 'T-Bill' },
  { value: 'STOCK_SALE', label: 'Stock sale proceeds', account: 'Market portfolio' },
  { value: 'FOUNDER_CONTRIBUTION', label: 'Founder contribution', account: 'Partner capital' },
  { value: 'OTHER', label: 'Other income', account: 'Cash' },
];

const today = () => new Date().toISOString().slice(0, 10);

export function LedgerForm({ onSubmit }: LedgerFormProps) {
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('BUSINESS_INCOME');
  const [counterparty, setCounterparty] = useState(''); // source entity (in) / recipient (out)
  const [purpose, setPurpose] = useState(''); // outflow only
  const [note, setNote] = useState('');

  const [errors, setErrors] = useState<LedgerValidationError[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const fieldError = (field: string) => errors.find((e) => e.field === field)?.message;

  function buildInput(): LedgerEntryInput {
    if (direction === 'IN') {
      const src = SOURCE_TYPES.find((s) => s.value === sourceType)!;
      const description = note.trim() || `${src.label}${counterparty.trim() ? ` from ${counterparty.trim()}` : ''}`;
      return { date, account: src.account, description, direction: 'IN', amount, source: src.label };
    }
    const description = note.trim() || `${purpose.trim() || 'Payment'}${counterparty.trim() ? ` to ${counterparty.trim()}` : ''}`;
    return { date, account: purpose.trim() || 'Cash', description, direction: 'OUT', amount, source: 'Manual' };
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

    setAmount(''); setCounterparty(''); setPurpose(''); setNote(''); setDate(today());
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

      {direction === 'IN' ? (
        <>
          <FormField
            label="Source of funds" name="sourceType" type="select" value={sourceType} required
            options={SOURCE_TYPES.map((s) => ({ value: s.value, label: s.label }))}
            onChange={(v) => setSourceType(v as SourceType)}
          />
          <FormField label="Source entity (optional)" name="counterparty" value={counterparty}
            placeholder="e.g. UNDC, Bank of Ghana" onChange={setCounterparty} />
        </>
      ) : (
        <>
          <FormField label="Recipient" name="counterparty" value={counterparty} placeholder="Who is being paid" onChange={setCounterparty} />
          <FormField label="Purpose" name="purpose" value={purpose} placeholder="e.g. Supplier payment, tax" onChange={setPurpose} />
        </>
      )}

      <FormField label="Note (optional)" name="note" value={note} placeholder="Factual note about the source or conditions" onChange={setNote} />

      <button type="submit" disabled={submitting}
        className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2">
        {submitting ? 'Saving…' : direction === 'IN' ? 'Record cash received' : 'Record cash paid'}
      </button>

      <p className="text-xs text-brand-muted">
        The ledger records what happened. Deciding where capital is deployed is done in the Decision Centre, where LEJ analyses your position and recommends an allocation for your approval.
      </p>
    </form>
  );
}
