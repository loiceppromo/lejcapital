'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addEngine, updateEngine, updateEngineInputs } from '@/app/actions/engines';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

type Tab = 'add' | 'inputs' | 'edit';
type SelectOption = { id: string; label: string };

export function EngineActionsForm({
  engines,
  cycles,
}: {
  engines: SelectOption[];
  cycles: SelectOption[];
}) {
  const [tab, setTab] = useState<Tab>('inputs');

  return (
    <div>
      <div className="flex gap-1 rounded-md border border-brand-line bg-brand-panel p-1">
        {([['inputs', 'Update inputs'], ['add', 'Add business'], ['edit', 'Edit business']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold ${tab === key ? 'bg-white text-brand-black shadow-sm' : 'text-brand-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 'inputs' && <UpdateInputsForm engines={engines} cycles={cycles} />}
        {tab === 'add' && <AddEngineForm />}
        {tab === 'edit' && <EditEngineForm engines={engines} />}
      </div>
    </div>
  );
}

function AddEngineForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      code: validateField(form.get('code') as string, { required: 'Business code is required', minLength: 2, maxLength: 10 }),
      name: validateField(form.get('name') as string, { required: 'Business name is required', minLength: 2 }),
    };
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512_000) {
      setErrors((prev) => ({ ...prev, logo: 'Logo must be under 500KB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
      setErrors((prev) => ({ ...prev, logo: null }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!validate(formData)) return;

    if (logoPreview) formData.set('logoUrl', logoPreview);
    setPending(true);
    setServerError('');
    const result = await addEngine(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      setLogoPreview(null);
      router.refresh();
      toast({ tone: 'success', title: 'Business added', message: 'Business starts in validation until enough inputs are resolved.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Business was not added', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Business added in VALIDATION status.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-brand-line bg-brand-panel">
            {logoPreview ? (
              <Image src={logoPreview} alt="Logo preview" width={56} height={56} className="h-14 w-14 rounded object-contain" unoptimized />
            ) : (
              <span className="text-[10px] text-brand-muted">Logo</span>
            )}
          </div>
          <label className="cursor-pointer text-[11px] font-medium text-brand-navy hover:underline">
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </label>
          {errors.logo && <p className="text-[11px] text-red-600">{errors.logo}</p>}
        </div>
        <div className="flex-1 space-y-3">
          <FormField label="Business code" name="code" required error={errors.code ?? undefined} placeholder="e.g. UNDC, DISTRO" hint="2-10 characters, uppercase recommended" />
          <FormField label="Name" name="name" required error={errors.name ?? undefined} placeholder="Full business name" />
        </div>
      </div>

      <FormField label="Description" name="description" placeholder="Brief description of this business" />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50">
        {pending ? 'Adding...' : 'Add business'}
      </button>
    </form>
  );
}

function EditEngineForm({ engines }: { engines: SelectOption[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const toast = useToast();

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512_000) {
      setErrors((prev) => ({ ...prev, logo: 'Logo must be under 500KB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
      setErrors((prev) => ({ ...prev, logo: null }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const engineId = formData.get('engineId') as string;
    if (!engineId) {
      setErrors({ engineId: 'Select a business' });
      return;
    }

    if (logoPreview) formData.set('logoUrl', logoPreview);
    setPending(true);
    setServerError('');
    const result = await updateEngine(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      router.refresh();
      toast({ tone: 'success', title: 'Business updated' });
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Update failed', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Business updated.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Business" name="engineId" type="select" required error={errors.engineId ?? undefined}
        options={engines.map((e) => ({ value: e.id, label: e.label }))} placeholder="Select business" />

      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-brand-line bg-brand-panel">
            {logoPreview ? (
              <Image src={logoPreview} alt="Logo preview" width={56} height={56} className="h-14 w-14 rounded object-contain" unoptimized />
            ) : (
              <span className="text-[10px] text-brand-muted">Logo</span>
            )}
          </div>
          <label className="cursor-pointer text-[11px] font-medium text-brand-navy hover:underline">
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </label>
          {errors.logo && <p className="text-[11px] text-red-600">{errors.logo}</p>}
        </div>
        <div className="flex-1 space-y-3">
          <FormField label="Name" name="name" placeholder="New name (leave empty to keep)" />
          <FormField label="Description" name="description" placeholder="New description" />
        </div>
      </div>

      <FormField label="Status" name="status" type="select"
        options={[
          { value: '', label: 'Keep current' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'VALIDATION', label: 'Validation' },
          { value: 'EXITED', label: 'Exited' },
        ]} />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50">
        {pending ? 'Updating...' : 'Update business'}
      </button>
    </form>
  );
}

function UpdateInputsForm({ engines, cycles }: { engines: SelectOption[]; cycles: SelectOption[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      engineId: validateField(form.get('engineId') as string, { required: 'Select a business' }),
      cycleId: validateField(form.get('cycleId') as string, { required: 'Select a cycle' }),
    };
    // Validate percentage inputs: 0-100 range
    for (const field of ['roic', 'cashConversion', 'sellThrough', 'repeatDemand', 'operationalRisk']) {
      e[field] = validateField(form.get(field) as string, { min: 0, max: 100 });
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
    const result = await updateEngineInputs(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      router.refresh();
      toast({ tone: 'success', title: 'Inputs updated', message: 'Brand Score and dashboard metrics can now recompute from stored inputs.' });
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Update failed', message });
    }
  }

  const inputs: [string, string][] = [
    ['roic', 'ROIC (%)'],
    ['cashConversion', 'Cash conversion (%)'],
    ['sellThrough', 'Sell-through (%)'],
    ['repeatDemand', 'Repeat demand (%)'],
    ['operationalRisk', 'Operational risk (%)'],
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Inputs updated.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Business" name="engineId" type="select" required error={errors.engineId ?? undefined}
        options={engines.map((e) => ({ value: e.id, label: e.label }))} placeholder="Select business" />
      <FormField label="Cycle" name="cycleId" type="select" required error={errors.cycleId ?? undefined}
        options={cycles.map((c) => ({ value: c.id, label: c.label }))} placeholder="Select cycle" />

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Capital allocated (GHS)" name="capitalAllocated" type="number" step="0.01" placeholder="0.00" />
        <FormField label="Profit returned (GHS)" name="profitReturned" type="number" step="0.01" placeholder="0.00" />
      </div>

      <p className="text-[11px] font-semibold uppercase text-brand-muted">Brand Score inputs (0-100%)</p>
      <div className="grid grid-cols-2 gap-3">
        {inputs.map(([name, label]) => (
          <FormField key={name} label={label} name={name} type="number" step="0.01" error={errors[name] ?? undefined} placeholder="TBC" hint="0-100" />
        ))}
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50">
        {pending ? 'Updating...' : 'Update inputs'}
      </button>
      <p className="text-xs text-brand-muted">Empty fields stay TBC. Brand Score auto-derives from the 5 inputs.</p>
    </form>
  );
}
