'use client';

import { useActionState, useState } from 'react';
import { addUser, updateUserRole, toggleUserActive } from '@/app/actions/users';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export function AddUserForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await addUser(formData);
      if (!result.ok) return { error: result.error };
      return null;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="user-name" className="mb-1 block text-xs font-semibold text-brand-charcoal">
            Name
          </label>
          <input
            id="user-name"
            name="name"
            type="text"
            required
            placeholder="Jane Doe"
            className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          />
        </div>
        <div>
          <label htmlFor="user-email" className="mb-1 block text-xs font-semibold text-brand-charcoal">
            Email
          </label>
          <input
            id="user-email"
            name="email"
            type="email"
            required
            placeholder="jane@lejcapital.com"
            className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          />
        </div>
        <div>
          <label htmlFor="user-role" className="mb-1 block text-xs font-semibold text-brand-charcoal">
            Role
          </label>
          <select
            id="user-role"
            name="role"
            required
            className="w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          >
            <option value="INVESTOR">Investor</option>
            <option value="OPERATOR">Operator</option>
            <option value="FUND_MANAGER">Fund Manager</option>
          </select>
        </div>
      </div>
      {state?.error && (
        <p className="text-xs font-medium text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50"
      >
        {pending ? 'Adding...' : 'Add user'}
      </button>
    </form>
  );
}

export function UserRoleSelect({ user }: { user: UserRecord }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await updateUserRole(formData);
      if (!result.ok) return { error: result.error };
      return null;
    },
    null,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={user.id} />
      <select
        name="role"
        defaultValue={user.role}
        onChange={(e) => {
          const form = e.target.closest('form');
          if (form) form.requestSubmit();
        }}
        disabled={pending}
        className="rounded border border-brand-line bg-white px-2 py-1 text-xs font-medium focus:border-brand-navy focus:outline-none disabled:opacity-50"
      >
        <option value="INVESTOR">Investor</option>
        <option value="OPERATOR">Operator</option>
        <option value="FUND_MANAGER">Fund Manager</option>
      </select>
      {state?.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}

export function UserActiveToggle({ user }: { user: UserRecord }) {
  const [optimistic, setOptimistic] = useState(user.active);
  const [, formAction, pending] = useActionState(
    async (_prev: null, formData: FormData) => {
      const newActive = formData.get('active') === 'true';
      setOptimistic(newActive);
      await toggleUserActive(formData);
      return null;
    },
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="active" value={optimistic ? 'false' : 'true'} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
          optimistic
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'bg-red-50 text-red-700 hover:bg-red-100'
        }`}
      >
        {optimistic ? 'Active' : 'Inactive'}
      </button>
    </form>
  );
}
