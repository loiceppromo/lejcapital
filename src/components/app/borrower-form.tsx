'use client';

import { useState } from 'react';
import { addBorrower } from '@/app/actions/loans';

export function BorrowerForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await addBorrower(new FormData(e.currentTarget));
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      setError(result.error ?? 'Failed.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && <div className="rounded-md bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#1f5d42] ring-1 ring-[#c9ddd4]">Borrower added.</div>}
      {error && <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm font-medium text-[#9b2f28] ring-1 ring-[#edc5c1]">{error}</div>}
      <Fld label="Name" name="name" required />
      <Fld label="Email" name="email" type="email" />
      <Fld label="Phone" name="phone" type="tel" />
      <div>
        <label className="block text-[11px] font-semibold uppercase text-brand-muted">ID type</label>
        <select name="idType" className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy">
          <option value="">Select...</option>
          <option value="NATIONAL_ID">National ID</option>
          <option value="PASSPORT">Passport</option>
          <option value="DRIVERS_LICENSE">Drivers License</option>
        </select>
      </div>
      <Fld label="ID number" name="idNumber" />
      <button type="submit" disabled={pending} className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {pending ? 'Adding...' : 'Add borrower'}
      </button>
    </form>
  );
}

function Fld({ label, name, type = 'text', required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase text-brand-muted">{label}</label>
      <input name={name} type={type} required={required} className="mt-1 w-full rounded-md border border-brand-line px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
    </div>
  );
}
