'use client';

import { useState } from 'react';
import { addBorrower } from '@/app/actions/loans';
import { FormField, validateField } from './form-field';
import { useToast } from './toast';

export function BorrowerForm() {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  function validate(form: FormData): boolean {
    const e: Record<string, string | null> = {
      name: validateField(form.get('name') as string, { required: 'Borrower name is required', minLength: 2 }),
      email: validateField(form.get('email') as string, {
        pattern: { regex: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
      }),
      idNumber: validateField(form.get('idNumber') as string, {}),
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
    const result = await addBorrower(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      setErrors({});
      toast({ tone: 'success', title: 'Borrower added', message: 'Borrower KYC record is now available for loan origination.' });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      const message = result.error ?? 'Failed.';
      setServerError(message);
      toast({ tone: 'error', title: 'Borrower was not added', message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Borrower added.</div>}
      {serverError && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{serverError}</div>}

      <FormField label="Name" name="name" required error={errors.name ?? undefined} placeholder="Full legal name" />
      <FormField label="Email" name="email" type="email" error={errors.email ?? undefined} placeholder="borrower@example.com" />
      <FormField label="Phone" name="phone" placeholder="+233 XX XXX XXXX" />
      <FormField
        label="ID type"
        name="idType"
        type="select"
        options={[
          { value: 'NATIONAL_ID', label: 'National ID' },
          { value: 'PASSPORT', label: 'Passport' },
          { value: 'DRIVERS_LICENSE', label: 'Drivers License' },
        ]}
      />
      <FormField label="ID number" name="idNumber" error={errors.idNumber ?? undefined} placeholder="e.g. GHA-XXXXXXXXX-X" />

      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Adding...' : 'Add borrower'}
      </button>
    </form>
  );
}
