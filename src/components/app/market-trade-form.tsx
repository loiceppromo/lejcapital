'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordMarketTrade } from '@/app/actions/market';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type SelectOption = { id: string; label: string };
type HoldingOption = {
  id: string;
  cycleId: string;
  instrumentType: 'GSE_EQUITY' | 'TBILL' | 'CASH';
  name: string;
  currentValue: string;
};

export function MarketTradeForm({
  cycles,
  holdings,
}: {
  cycles: SelectOption[];
  holdings: HoldingOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [side, setSide] = useState('BUY');
  const [cycleId, setCycleId] = useState(cycles[0]?.id ?? '');
  const [holdingId, setHoldingId] = useState('');

  const cycleHoldings = useMemo(
    () => holdings.filter((holding) => holding.cycleId === cycleId),
    [holdings, cycleId],
  );
  const selectedHolding = cycleHoldings.find((holding) => holding.id === holdingId);

  function validate(form: FormData): boolean {
    const currentSide = String(form.get('side') ?? '');
    const e: Record<string, string | null> = {
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
      side: validateField(currentSide, { required: 'Select buy or sell' }),
      instrumentType: validateField(form.get('instrumentType') as string, { required: 'Select an instrument type' }),
      name: validateField(form.get('name') as string, { required: 'Instrument name is required', minLength: 2 }),
      grossAmount: validateField(form.get('grossAmount') as string, { required: 'Gross amount is required', min: 0.01 }),
      fees: validateField(form.get('fees') as string, { min: 0 }),
      quantity: validateField(form.get('quantity') as string, { min: 0 }),
      price: validateField(form.get('price') as string, { min: 0 }),
      tradeDate: validateField(form.get('tradeDate') as string, { required: 'Trade date is required' }),
      holdingId: currentSide === 'SELL'
        ? validateField(form.get('holdingId') as string, { required: 'Select the holding being sold' })
        : null,
    };
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (selectedHolding) {
      formData.set('instrumentType', selectedHolding.instrumentType);
      formData.set('name', selectedHolding.name);
    }
    if (!validate(formData)) return;

    setPending(true);
    setServerError('');
    const result = await recordMarketTrade(formData);
    setPending(false);

    if (result.ok) {
      setSuccess(true);
      setErrors({});
      setHoldingId('');
      router.refresh();
      toast({ tone: 'success', title: 'Trade recorded', message: 'Position, ledger, and audit trail were updated.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to record trade.';
      setServerError(message);
      toast({ tone: 'error', title: 'Trade blocked', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Trade recorded.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField
        label="Cycle"
        name="cycleId"
        type="select"
        required
        value={cycleId}
        error={errors.cycleId ?? undefined}
        options={cycles.map((cycle) => ({ value: cycle.id, label: cycle.label }))}
        onChange={(value) => {
          setCycleId(value);
          setHoldingId('');
        }}
      />

      <FormField
        label="Side"
        name="side"
        type="select"
        required
        value={side}
        error={errors.side ?? undefined}
        options={[
          { value: 'BUY', label: 'Buy' },
          { value: 'SELL', label: 'Sell' },
        ]}
        onChange={(value) => {
          setSide(value);
          setHoldingId('');
        }}
      />

      <FormField
        label={side === 'SELL' ? 'Holding to sell' : 'Existing holding (optional)'}
        name="holdingId"
        type="select"
        value={holdingId}
        error={errors.holdingId ?? undefined}
        hint={side === 'BUY' ? 'Leave blank to create a new position.' : undefined}
        options={cycleHoldings.map((holding) => ({
          value: holding.id,
          label: `${holding.name} · ${holding.instrumentType.replaceAll('_', ' ')} · ${holding.currentValue}`,
        }))}
        onChange={setHoldingId}
      />

      {!selectedHolding && (
        <>
          <FormField
            label="Instrument type"
            name="instrumentType"
            type="select"
            required
            error={errors.instrumentType ?? undefined}
            options={[
              { value: 'GSE_EQUITY', label: 'GSE Equity' },
              { value: 'TBILL', label: 'T-Bill' },
              { value: 'CASH', label: 'Cash' },
            ]}
          />
          <FormField label="Name / ticker" name="name" required error={errors.name ?? undefined} placeholder="e.g. MTNGH, 91-day T-Bill" />
        </>
      )}

      {selectedHolding && (
        <div className="rounded-md border border-brand-line bg-brand-panel px-3 py-2 text-xs text-brand-muted">
          Selected: <span className="font-semibold text-brand-black">{selectedHolding.name}</span> · {selectedHolding.instrumentType.replaceAll('_', ' ')}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Gross amount (GHS)" name="grossAmount" type="number" step="0.01" required error={errors.grossAmount ?? undefined} />
        <FormField label="Fees (GHS)" name="fees" type="number" step="0.01" error={errors.fees ?? undefined} hint="Brokerage, settlement, or bank charges." />
        <FormField label="Quantity" name="quantity" type="number" step="0.000001" error={errors.quantity ?? undefined} />
        <FormField label="Price" name="price" type="number" step="0.000001" error={errors.price ?? undefined} />
      </div>

      <FormField label="Trade date" name="tradeDate" type="date" required error={errors.tradeDate ?? undefined} />
      <FormField label="Execution venue" name="executionVenue" placeholder="Broker, bank, auction, cash transfer" />
      <FormField label="Notes" name="notes" type="textarea" rows={2} placeholder="Investment memo, IC reference, or execution notes" />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Recording...' : 'Record trade'}
      </button>
    </form>
  );
}
