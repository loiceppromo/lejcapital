'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveMissingData } from '@/app/actions/missing-data';
import { useToast } from './toast';

type MissingDataOption = {
  entity: string;
  entityType: string;
  entityId: string;
  field: string;
  blocking: boolean;
};

export function MissingDataForm({ items }: { items: MissingDataOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const current = items.find((item) => keyFor(item) === selected);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await resolveMissingData(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      router.refresh();
      toast({ tone: 'success', title: 'Missing data resolved', message: 'The value and source were saved to the audit trail.' });
      (e.target as HTMLFormElement).reset();
      setSelected('');
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed to resolve missing data.';
      setError(message);
      toast({ tone: 'error', title: 'Missing-data resolution failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Missing data resolved.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}

      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">Item</label>
        <select value={selected} onChange={(event) => setSelected(event.target.value)} required className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="">Select missing item</option>
          {items.map((item) => (
            <option key={keyFor(item)} value={keyFor(item)}>
              {item.entity} · {item.field}
            </option>
          ))}
        </select>
      </div>

      <input type="hidden" name="entityType" value={current?.entityType ?? ''} />
      <input type="hidden" name="entityId" value={current?.entityId ?? ''} />
      <input type="hidden" name="field" value={current?.field ?? ''} />

      <Field label="Value" name="value" required />
      <Field label="Source" name="source" required placeholder="Document, report, or reviewed input source" />

      <button type="submit" disabled={pending || !current} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Resolving...' : 'Resolve item'}
      </button>
      <p className="text-xs leading-5 text-brand-muted">Engine score values are entered as percentages. Borrower ID values are stored as entered.</p>
    </form>
  );
}

function keyFor(item: MissingDataOption) {
  return `${item.entityType}:${item.entityId}:${item.field}`;
}

function Field({ label, name, required, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase text-brand-muted">{label}</label>
      <input name={name} required={required} placeholder={placeholder} className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
    </div>
  );
}
