'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandMark, LogoIcon } from '@/components/brand/logo';
import { getActiveCycle, getOverview, getPlatformState } from '@/lib/platform/selectors';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { StatusBadge } from './status-badge';

const navItems = [
  ['Dashboard', '/dashboard'],
  ['Cycles', '/cycles'],
  ['Ledger', '/ledger'],
  ['Market', '/market'],
  ['Loans', '/loans'],
  ['Engines', '/engines'],
  ['Investors', '/investors'],
  ['Risk', '/risk'],
  ['Reports', '/reports'],
  ['Audit', '/audit'],
  ['Settings', '/settings'],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const state = getPlatformState();
  const cycle = getActiveCycle(state);
  const overview = getOverview(state);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const configured = isSupabaseConfigured();

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    async function loadUser() {
      const { createClient } = await import('@/lib/supabase/browser');
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user) {
        setUserEmail(data.user.email ?? null);
      }
    }

    loadUser();
    return () => { cancelled = true; };
  }, [configured]);

  const modeLabel = configured ? (userEmail ?? 'Authenticated') : 'Seed data';

  return (
    <div className="min-h-screen bg-brand-surface text-brand-black">
      {/* ── Desktop sidebar (unchanged) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 border-r border-brand-silver bg-brand-black xl:w-64 lg:block">
        <div className="flex h-20 items-center justify-center border-b border-white/10 px-4 xl:justify-start xl:px-5">
          <LogoIcon background="dark" className="h-10 w-10 xl:hidden" priority />
          <BrandMark background="dark" className="hidden h-12 xl:block" priority />
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map(([label, href]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`block rounded-md px-3 py-2.5 text-center text-sm font-medium xl:text-left ${
                  active ? 'bg-white text-brand-black' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="xl:hidden">{label.slice(0, 2)}</span>
                <span className="hidden xl:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="flex items-center justify-center gap-3 xl:justify-start">
            <LogoIcon background="dark" className="h-9 w-9" />
            <div className="hidden xl:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mode</p>
              <p className="max-w-[160px] truncate text-sm font-medium text-white">{modeLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-in panel */}
          <aside className="relative z-50 flex h-full w-72 flex-col bg-brand-black shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <BrandMark background="dark" className="h-10" priority />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navItems.map(([label, href]) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-md px-3 py-2.5 text-sm font-medium ${
                      active ? 'bg-white text-brand-black' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mode</p>
              <p className="truncate text-sm font-medium text-white">{modeLabel}</p>
              {configured && (
                <div className="mt-3">
                  <MobileSignOutButton />
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-20 xl:pl-64">
        <header className="sticky top-0 z-20 border-b border-brand-silver bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              {/* Hamburger button — mobile only */}
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-md p-1.5 text-brand-charcoal hover:bg-brand-surface lg:hidden"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
              </button>
              <LogoIcon background="light" className="h-9 w-9 lg:hidden" priority />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Active cycle</p>
                <p className="text-sm font-semibold text-brand-black">
                  Cycle {cycle.sequenceNo} · {cycle.status}
                </p>
              </div>
            </div>
            {/* Desktop header actions */}
            <div className="hidden items-center gap-3 md:flex">
              <StatusBadge state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}>
                PCR {overview.pcr.pcr.toFixed(2)}x
              </StatusBadge>
              <StatusBadge state={overview.riskBreaches > 0 ? 'BREACH' : 'GREEN'}>
                {overview.riskBreaches} breaches
              </StatusBadge>
              <div className="rounded-md border border-brand-silver px-3 py-2 text-sm">
                <span className="text-brand-muted">
                  {configured ? userEmail ?? 'User' : 'Admin'}
                </span>
                <span className="ml-2 font-semibold">Fund Manager</span>
              </div>
              {configured ? (
                <SignOutButton />
              ) : (
                <Link
                  href="/audit"
                  className="rounded-md bg-brand-navy px-3 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark"
                >
                  Review actions
                </Link>
              )}
            </div>
            {/* Mobile compact status */}
            <div className="flex items-center gap-2 md:hidden">
              <StatusBadge state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}>
                {overview.pcr.pcr.toFixed(2)}x
              </StatusBadge>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

function SignOutButton() {
  return (
    <form action="/login/actions" method="post">
      <button
        type="button"
        onClick={async () => {
          const { logout } = await import('@/app/login/actions');
          await logout();
        }}
        className="rounded-md border border-brand-silver px-3 py-2 text-sm font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
      >
        Sign out
      </button>
    </form>
  );
}

function MobileSignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        const { logout } = await import('@/app/login/actions');
        await logout();
      }}
      className="w-full rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-slate-300 hover:border-white/40 hover:text-white"
    >
      Sign out
    </button>
  );
}
