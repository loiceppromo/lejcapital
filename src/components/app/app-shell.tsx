'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandMark, LogoIcon } from '@/components/brand/logo';
import { getActiveCycle, getOverview, getPlatformState } from '@/lib/platform/selectors';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getNavItemsForRole, type Role } from '@/lib/auth/role-defs';
import { NotificationBell } from './notification-bell';
import { StatusBadge } from './status-badge';

const ROLE_LABELS: Record<Role, string> = {
  FUND_MANAGER: 'Fund Manager',
  OPERATOR: 'Operator',
  INVESTOR: 'Investor',
};

interface AppShellProps {
  children: React.ReactNode;
  userRole?: Role;
  userEmail?: string | null;
  dbConnected?: boolean;
}

export function AppShell({ children, userRole = 'FUND_MANAGER', userEmail: serverEmail = null, dbConnected = false }: AppShellProps) {
  const pathname = usePathname();
  const state = getPlatformState();
  const cycle = getActiveCycle(state);
  const overview = getOverview(state);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const configured = isSupabaseConfigured();

  const navItems = getNavItemsForRole(userRole);
  const userEmail = serverEmail ?? clientEmail;

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
        setClientEmail(data.user.email ?? null);
      }
    }

    loadUser();
    return () => { cancelled = true; };
  }, [configured]);

  const modeLabel = configured ? (userEmail ?? 'Authenticated') : 'Seed data';
  const roleLabel = ROLE_LABELS[userRole];

  return (
    <div className="min-h-screen bg-brand-surface text-brand-black">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 border-r border-white/10 bg-brand-black xl:w-64 lg:block">
        <div className="flex h-16 items-center justify-center border-b border-white/10 px-4 xl:justify-start xl:px-5">
          <LogoIcon background="dark" className="h-9 w-9 xl:hidden" priority />
          <BrandMark background="dark" className="hidden h-10 xl:block" priority />
        </div>
        <nav className="space-y-0.5 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`block rounded-md px-3 py-2 text-center text-[13px] font-medium xl:text-left ${
                  active ? 'bg-white text-brand-black' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="xl:hidden">{item.label.slice(0, 2)}</span>
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="flex items-center justify-center gap-3 xl:justify-start">
            <LogoIcon background="dark" className="h-8 w-8" />
            <div className="hidden xl:block">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Access</p>
              <p className="max-w-[160px] truncate text-xs font-medium text-white">{modeLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
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
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-md px-3 py-2 text-sm font-medium ${
                      active ? 'bg-white text-brand-black' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Access</p>
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
        <header className="sticky top-0 z-20 border-b border-brand-line bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex items-center gap-3">
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
                <p className="text-[10px] font-semibold uppercase text-brand-muted">Active cycle</p>
                <p className="text-sm font-semibold text-brand-black">
                  Cycle {cycle.sequenceNo} · {cycle.status}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <StatusBadge state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}>
                PCR {overview.pcr.pcr.toFixed(2)}x
              </StatusBadge>
              <StatusBadge state={overview.riskBreaches > 0 ? 'BREACH' : 'GREEN'}>
                {overview.riskBreaches} breaches
              </StatusBadge>
              <div className="rounded-md border border-brand-line bg-brand-panel px-3 py-1.5 text-xs">
                <span className="text-brand-muted">
                  {configured ? userEmail ?? 'User' : 'Admin'}
                </span>
                <span className="ml-2 font-semibold">{roleLabel}</span>
              </div>
              <NotificationBell enabled={dbConnected} />
              {configured ? (
                <SignOutButton />
              ) : (
                <Link
                  href="/audit"
                  className="rounded-md bg-brand-navy px-3 py-2 text-xs font-semibold text-white hover:bg-brand-navy-dark"
                >
                  Review actions
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <StatusBadge state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}>
                {overview.pcr.pcr.toFixed(2)}x
              </StatusBadge>
              <NotificationBell enabled={dbConnected} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">{children}</main>
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
        className="rounded-md border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
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
