'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';
import type { AuthMode } from '@/lib/auth/mode';

export function LoginForm({ authMode }: { authMode: AuthMode }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  if (authMode === 'blocked') {
    return (
      <div className="rounded-md border border-brand-danger/40 bg-brand-danger/10 px-3 py-3 text-sm text-[#f0a19b]">
        <p className="font-semibold">Authentication configuration required</p>
        <p className="mt-1">
          A persistent database is configured, but Supabase Auth is not. Add Supabase credentials before accessing live records.
        </p>
        <p className="mt-2 text-xs">
          Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in the environment.
        </p>
      </div>
    );
  }

  if (authMode === 'seed') {
    return (
      <div>
        <div className="rounded-md border border-brand-warning/40 bg-brand-warning/10 px-3 py-3 text-sm text-[#f1c97a]">
          <p className="font-semibold">Seed mode active</p>
          <p className="mt-1">
            Supabase is not configured. The app will run with local seed data and no authentication.
          </p>
          <p className="mt-2 text-xs text-[#e4bd6f]">
            Copy <code className="font-mono">.env.local.example</code> to{' '}
            <code className="font-mono">.env.local</code> and add your Supabase credentials.
          </p>
        </div>
        <form action={action} className="mt-4">
          <button
            type="submit"
            className="modern-button w-full rounded-lg bg-brand-navy px-4 py-3 text-sm font-semibold text-white hover:bg-brand-navy-soft"
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
        <div className="rounded-md border border-brand-danger/40 bg-brand-danger/10 px-3 py-2 text-sm text-[#f0a19b]">
          {state.error}
          <p className="mt-1 text-xs">Use the authorized admin account: loiceppromo@gmail.com.</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8993a3]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="loiceppromo@gmail.com"
          required
          className="mt-1 w-full rounded-lg border border-[#273143] bg-[#0c1118] px-3 py-2.5 text-sm text-[#eef1f5] placeholder:text-[#596474] focus:border-[#4f89bd] focus:outline-none focus:ring-1 focus:ring-[#4f89bd]"
        />
        <p className="mt-1 text-xs text-[#8993a3]">Admin access is restricted to loiceppromo@gmail.com.</p>
      </div>

      <div>
        <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8993a3]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border border-[#273143] bg-[#0c1118] px-3 py-2.5 text-sm text-[#eef1f5] focus:border-[#4f89bd] focus:outline-none focus:ring-1 focus:ring-[#4f89bd]"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="modern-button w-full rounded-lg bg-brand-navy px-4 py-3 text-sm font-semibold text-white hover:bg-brand-navy-soft disabled:opacity-60"
      >
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
