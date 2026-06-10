'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const configured = isSupabaseConfigured();

  if (!configured) {
    return (
      <div>
        <div className="rounded-md bg-[#fbf3df] px-3 py-3 text-sm text-[#80611a] ring-1 ring-[#ead8aa]">
          <p className="font-semibold">Seed mode active</p>
          <p className="mt-1">
            Supabase is not configured. The app will run with local seed data and no authentication.
          </p>
          <p className="mt-2 text-xs text-[#80611a]">
            Copy <code className="font-mono">.env.local.example</code> to{' '}
            <code className="font-mono">.env.local</code> and add your Supabase credentials.
          </p>
        </div>
        <form action={action} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark"
          >
            Enter seed mode
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="rounded-md bg-[#fbebea] px-3 py-2 text-sm text-[#9b2f28] ring-1 ring-[#edc5c1]">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-[11px] font-semibold uppercase text-brand-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-[11px] font-semibold uppercase text-brand-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-60"
      >
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
