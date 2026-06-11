'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogoFull, LogoIcon } from '@/components/brand/logo';
import { getActiveCycle, getLoanMetrics, getMissingData, getOverview, getPlatformState } from '@/lib/platform/selectors';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { useRealtimeRefresh } from '@/lib/supabase/use-realtime-refresh';
import { getNavItemsForRole, type NavIcon, type Role } from '@/lib/auth/role-defs';
import { CurrencyProvider, CurrencyToggle } from './currency-toggle';
import { DarkModeToggle } from './dark-mode-toggle';
import { FaviconBadge } from './favicon-badge';
import { Icon } from './icon';
import { KeyboardShortcuts } from './keyboard-shortcuts';
import { MarketTicker } from './market-ticker';
import { NotificationBell } from './notification-bell';
import { StatusBadge } from './status-badge';
import { ToastProvider } from './toast';
import { VoiceAssistant } from './voice-assistant';

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
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const saved = window.localStorage.getItem('lej-density');
    return saved === 'compact' || saved === 'comfortable' ? saved : 'comfortable';
  });
  const configured = isSupabaseConfigured();

  const navItems = getNavItemsForRole(userRole);
  const userEmail = serverEmail ?? clientEmail;
  useRealtimeRefresh({ enabled: dbConnected });

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

  function toggleDensity() {
    setDensity((current) => {
      const next = current === 'compact' ? 'comfortable' : 'compact';
      window.localStorage.setItem('lej-density', next);
      return next;
    });
  }

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
    <CurrencyProvider>
    <ToastProvider>
    <div className={`min-h-screen bg-brand-surface text-brand-black ${density === 'compact' ? 'density-compact' : ''}`}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 border-r border-white/10 bg-brand-black xl:w-64 lg:block">
        <div className="flex h-16 items-center justify-center border-b border-white/10 px-4 xl:justify-start xl:px-5">
          <LogoIcon background="dark" className="h-9 w-9 xl:hidden" priority />
          <LogoFull background="dark" className="hidden xl:block h-10" priority />
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
                className={`group relative flex items-center justify-center gap-3 rounded-md border-l-2 px-3 py-2 text-[13px] font-medium transition-all xl:justify-start ${
                  active
                    ? 'border-brand-navy bg-white text-brand-black sidebar-active shadow-sm'
                    : 'border-transparent text-slate-400 hover:bg-white/10 hover:text-white hover:translate-x-0.5'
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
              <LogoFull background="dark" className="h-10" priority />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <Icon name="close" />
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
        <MarketTicker />
        <header className="sticky top-0 z-20 border-b border-brand-line glass-header">
          <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-md p-1.5 text-brand-charcoal hover:bg-brand-surface lg:hidden"
                aria-label="Open menu"
              >
                <Icon name="menu" className="h-6 w-6" />
              </button>
              <LogoIcon background="light" className="h-9 w-9 lg:hidden" priority />
              <div>
                <p className="text-[10px] font-semibold uppercase text-brand-muted">Active cycle</p>
                <p className="text-sm font-semibold text-brand-black">
                  Cycle {cycle.sequenceNo} · {cycle.status}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <StatusBadge state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}>
                PCR {overview.pcr.pcr.toFixed(2)}x
              </StatusBadge>
              {overview.riskBreaches > 0 && (
                <StatusBadge state="BREACH">{overview.riskBreaches} breach{overview.riskBreaches > 1 ? 'es' : ''}</StatusBadge>
              )}
              <div className="ml-1 flex items-center gap-1.5">
                <CurrencyToggle />
                <NotificationBell enabled={dbConnected} />
                <DarkModeToggle />
                <button
                  type="button"
                  onClick={toggleDensity}
                  className="rounded-md border border-brand-line bg-white p-1.5 text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
                  title={density === 'compact' ? 'Switch to comfortable' : 'Switch to compact'}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    {density === 'compact'
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
                    }
                  </svg>
                </button>
              </div>
              <div className="ml-1 flex items-center gap-2 border-l border-brand-line pl-3">
                <div className="text-right text-xs leading-tight">
                  <p className="font-semibold text-brand-black">{roleLabel}</p>
                  <p className="max-w-[140px] truncate text-brand-muted">{configured ? userEmail ?? 'User' : 'Seed mode'}</p>
                </div>
                {configured ? (
                  <SignOutButton />
                ) : (
                  <Link
                    href="/audit"
                    className="rounded-md bg-brand-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy/90"
                  >
                    Audit
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <StatusBadge state={overview.pcr.status === 'GREEN' ? 'GREEN' : overview.pcr.status === 'WATCH' ? 'WATCH' : 'BREACH'}>
                {overview.pcr.pcr.toFixed(2)}x
              </StatusBadge>
              <NotificationBell enabled={dbConnected} />
            </div>
          </div>
        </header>

        <main className="page-fade-in mx-auto max-w-[1440px] px-4 py-4 lg:px-6">{children}</main>
      </div>
      <KeyboardShortcuts />
      <FaviconBadge count={overview.riskBreaches} />
      {userRole !== 'INVESTOR' && <VoiceAssistant />}
    </div>
    </ToastProvider>
    </CurrencyProvider>
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
  return <Icon name={icon} className={className} />;
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
