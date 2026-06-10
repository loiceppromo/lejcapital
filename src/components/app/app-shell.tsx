'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandMark, LogoIcon } from '@/components/brand/logo';
import { getActiveCycle, getLoanMetrics, getMissingData, getOverview, getPlatformState } from '@/lib/platform/selectors';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getNavItemsForRole, type NavIcon, type Role } from '@/lib/auth/role-defs';
import { KeyboardShortcuts } from './keyboard-shortcuts';
import { NotificationBell } from './notification-bell';
import { StatusBadge } from './status-badge';
import { ToastProvider } from './toast';

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
  const loanMetrics = getLoanMetrics(state);
  const missingData = getMissingData(state);
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
  const navAttention = getNavAttention({
    riskBreaches: overview.riskBreaches,
    blockingMissingData: missingData.filter((item) => item.blocking).length,
    defaultedLoans: loanMetrics.summaries.filter((summary) => summary.status === 'DEFAULTED').length,
    par30: loanMetrics.par30.toNumber(),
    par90: loanMetrics.par90.toNumber(),
  });

  return (
    <ToastProvider>
    <div className="min-h-screen bg-brand-surface text-brand-black">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 border-r border-white/10 bg-brand-black xl:w-64 lg:block">
        <div className="flex h-16 items-center justify-center border-b border-white/10 px-4 xl:justify-start xl:px-5">
          <LogoIcon background="dark" className="h-9 w-9 xl:hidden" priority />
          <BrandMark background="dark" className="hidden h-10 xl:block" priority />
        </div>
        <nav className="space-y-0.5 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const attentionTone = navAttention[item.href];
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`group relative flex items-center justify-center gap-3 rounded-md border-l-2 px-3 py-2 text-[13px] font-medium transition-colors xl:justify-start ${
                  active
                    ? 'border-brand-navy bg-white text-brand-black'
                    : 'border-transparent text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <NavIconGlyph icon={item.icon} className="h-5 w-5 shrink-0" />
                <span className="hidden xl:inline">{item.label}</span>
                {attentionTone ? <NavAttentionDot tone={attentionTone} /> : null}
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
                const attentionTone = navAttention[item.href];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`relative flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'border-brand-navy bg-white text-brand-black'
                        : 'border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <NavIconGlyph icon={item.icon} className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                    {attentionTone ? <NavAttentionDot tone={attentionTone} /> : null}
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
      <KeyboardShortcuts />
    </div>
    </ToastProvider>
  );
}

function getNavAttention({
  riskBreaches,
  blockingMissingData,
  defaultedLoans,
  par30,
  par90,
}: {
  riskBreaches: number;
  blockingMissingData: number;
  defaultedLoans: number;
  par30: number;
  par90: number;
}) {
  const attention: Record<string, 'amber' | 'red' | undefined> = {};
  if (riskBreaches > 0) attention['/risk'] = 'red';
  if (blockingMissingData > 0) attention['/audit'] = 'amber';
  if (defaultedLoans > 0 || par90 > 0) attention['/loans'] = 'red';
  else if (par30 > 0) attention['/loans'] = 'amber';
  return attention;
}

function NavAttentionDot({ tone }: { tone: 'amber' | 'red' }) {
  return (
    <span
      className={`absolute right-2 top-2 h-2 w-2 rounded-full xl:static xl:ml-auto ${tone === 'red' ? 'bg-red-500' : 'bg-amber-400'}`}
      aria-hidden="true"
    />
  );
}

function NavIconGlyph({ icon, className }: { icon: NavIcon; className?: string }) {
  const common = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
    stroke: 'currentColor',
    'aria-hidden': true,
  };

  switch (icon) {
    case 'chart-bar':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m16 14H4m4-4V9m4 6V6m4 9v-4" />
        </svg>
      );
    case 'arrows-repeat':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 2.5 21 6l-4 3.5M3 11V9a3 3 0 0 1 3-3h15M7 21.5 3 18l4-3.5M21 13v2a3 3 0 0 1-3 3H3" />
        </svg>
      );
    case 'book-open':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5c-1.7-1.1-3.6-1.6-6-1.6H4.5v13H6c2.4 0 4.3.5 6 1.6m0-13c1.7-1.1 3.6-1.6 6-1.6h1.5v13H18c-2.4 0-4.3.5-6 1.6m0-13v13" />
        </svg>
      );
    case 'trending-up':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4 16 5-5 4 4 7-8m0 0h-5m5 0v5" />
        </svg>
      );
    case 'banknotes':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v10H4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 10.5h.01M17 13.5h.01M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        </svg>
      );
    case 'cog':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m18.5 13.2.1-2.4 2-1.4-2-3.5-2.4 1a8 8 0 0 0-2-1.1L12 3.5 9.8 5.8a8 8 0 0 0-2 1.1l-2.4-1-2 3.5 2 1.4.1 2.4-2 1.4 2 3.5 2.4-1a8 8 0 0 0 2 1.1l2.2 2.3 2.2-2.3a8 8 0 0 0 2-1.1l2.4 1 2-3.5-2.2-1.4Z" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4m4-7a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm5.5 1.5c1.7.4 2.9 1.8 2.9 3.5M17 9a2.5 2.5 0 0 0-1.2-2.1" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-3.5 7-10V5.5L12 3 5 5.5V11c0 6.5 7 10 7 10Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.7 1.7 3.6-4" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6l1 2h3v15H5V6h3l1-2Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h6M9 15h4" />
        </svg>
      );
    case 'archive-box':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v4H4zM6 11v8h12v-8M10 15h4" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 12a7.6 7.6 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-1.7-1L12.5 3h-1l-2.3 3a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.8 7.8 0 0 0 1.7 1l2.3 3h1l2.3-3a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />
        </svg>
      );
  }
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
