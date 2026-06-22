import type { Metadata } from 'next';
import Link from 'next/link';
import { LogoFull, LogoIcon } from '@/components/brand/logo';
import { CsvImportSection } from '@/components/app/csv-import-section';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { PageNav } from '@/components/app/page-nav';
import { ResetSystemPanel } from '@/components/app/reset-system-panel';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { FundParamsForm } from '@/components/app/fund-params-form';
import { AddUserForm, ChangePasswordForm, UserRoleSelect, UserActiveToggle } from '@/components/app/user-management-form';
import { loadPlatformState } from '@/lib/data/queries';
import { loadFundParameters } from '@/app/actions/system';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isDatabaseConfigured } from '@/lib/db';
import { guardPage } from '@/lib/auth/page-guard';
import { canAccess } from '@/lib/auth/roles';
import { getUsers } from '@/app/actions/users';
import { getPersistedCycles } from '@/lib/platform/cycle-utils';
import { getActiveCycle, getActiveSleeves, getLoanMetrics, getMarketHoldings, getOverview } from '@/lib/platform/selectors';
import type { RiskState } from '@/lib/platform/types';

export const metadata: Metadata = { title: 'Settings | LEJ Capital' };

type ReadinessState = RiskState;
type ReadinessItem = {
  area: string;
  state: ReadinessState;
  status: string;
  detail: string;
  action: string;
  href: string;
};

function buildReadinessItems({
  state,
  dbConnected,
  authConnected,
  userCount,
}: {
  state: Awaited<ReturnType<typeof loadPlatformState>>;
  dbConnected: boolean;
  authConnected: boolean;
  userCount: number;
}): ReadinessItem[] {
  const persistedCycles = getPersistedCycles(state);
  const activeCycle = getActiveCycle(state);
  const sleeves = getActiveSleeves(state);
  const overview = getOverview(state);
  const loans = getLoanMetrics(state);
  const holdings = getMarketHoldings(state);
  const allCoreSleeves = ['PROTECTION', 'RESERVE', 'OPERATING_ALPHA', 'MARKET_ALPHA', 'LOAN_BOOK'];
  const fundedSleeves = sleeves.filter((sleeve) => sleeve.fundedAmount.gt(0)).length;
  const missingCoreSleeves = allCoreSleeves.filter((type) => !sleeves.some((sleeve) => sleeve.type === type));
  const hasEmailProvider = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const hasWhatsappProvider = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
  const hasAuditPack = state.auditEntries.length > 0 || state.ledgerEntries.length > 0 || state.contributions.length > 0;
  const pcrRiskState: RiskState =
    overview.riskBreaches > 0 || overview.pcr.status === 'PROTECTION_MODE'
      ? 'BREACH'
      : overview.pcr.status === 'WATCH' || overview.pcr.status === 'CAUTION'
        ? 'WATCH'
        : 'GREEN';

  return [
    {
      area: 'Database',
      state: dbConnected ? 'GREEN' : 'BREACH',
      status: dbConnected ? 'Connected' : 'Blocked',
      detail: dbConnected ? 'Supabase Postgres is connected.' : 'Persistent database is not configured.',
      action: dbConnected ? 'No action needed.' : 'Set DATABASE_URL and deploy environment variables.',
      href: '/settings#system',
    },
    {
      area: 'Authentication',
      state: authConnected && userCount > 0 ? 'GREEN' : authConnected ? 'WATCH' : 'BREACH',
      status: authConnected ? `${userCount} user${userCount === 1 ? '' : 's'}` : 'Blocked',
      detail: authConnected ? 'Supabase Auth is active.' : 'Login is not connected to Supabase Auth.',
      action: authConnected && userCount > 0 ? 'No action needed.' : 'Create/sync the Fund Manager user.',
      href: '/settings#users',
    },
    {
      area: 'Cycle setup',
      state: persistedCycles.length > 0 ? 'GREEN' : 'BREACH',
      status: persistedCycles.length > 0 ? `Cycle ${activeCycle.sequenceNo} ${activeCycle.status}` : 'Blocked',
      detail: persistedCycles.length > 0 ? `${persistedCycles.length} persisted cycle(s) found.` : 'No real cycle exists yet.',
      action: persistedCycles.length > 0 ? 'Keep lifecycle status current.' : 'Create Cycle 1 before entering financial activity.',
      href: '/cycles',
    },
    {
      area: 'Capital partners',
      state: state.investors.length > 0 && state.contributions.length > 0 ? 'GREEN' : state.investors.length > 0 ? 'WATCH' : 'BREACH',
      status: `${state.investors.length} partner(s), ${state.contributions.length} contribution(s)`,
      detail: `Investor principal due is ${overview.investorPrincipalDue.toFixed(2)} GHS.`,
      action: state.contributions.length > 0 ? 'Review statements before cycle close.' : 'Add partners and record capital contributions.',
      href: '/investors',
    },
    {
      area: 'Sleeve sizing',
      state: missingCoreSleeves.length === 0 && fundedSleeves > 0 ? 'GREEN' : missingCoreSleeves.length === 0 ? 'WATCH' : 'BREACH',
      status: `${fundedSleeves}/${allCoreSleeves.length} funded`,
      detail: missingCoreSleeves.length === 0 ? 'All core sleeve records exist.' : `Missing: ${missingCoreSleeves.join(', ')}.`,
      action: fundedSleeves > 0 ? 'Review Protection and Reserve before deployment.' : 'Size sleeves in Cycle actions.',
      href: '/cycles#sleeve-sizing',
    },
    {
      area: 'Ledger',
      state: state.ledgerEntries.length > 0 ? 'GREEN' : 'WATCH',
      status: `${state.ledgerEntries.length} entries`,
      detail: 'Ledger is append-only and feeds audit/export readiness.',
      action: state.ledgerEntries.length > 0 ? 'Keep all cash movements posted.' : 'Record capital receipts and deployment entries.',
      href: '/ledger',
    },
    {
      area: 'Loan book',
      state: state.borrowers.length > 0 && state.loans.length > 0 ? 'GREEN' : state.borrowers.length > 0 ? 'WATCH' : 'WATCH',
      status: `${state.borrowers.length} borrower(s), ${state.loans.length} loan(s)`,
      detail: `PAR > 30: ${loans.par30.times(100).toFixed(2)}%; PAR > 90: ${loans.par90.times(100).toFixed(2)}%.`,
      action: state.loans.length > 0 ? 'Refresh aging and verify contracts/messages.' : 'Add borrowers, then originate loans only after cycle setup.',
      href: '/loans',
    },
    {
      area: 'Market portfolio',
      state: holdings.length > 0 ? 'GREEN' : 'WATCH',
      status: `${holdings.length} holding(s), ${state.marketTrades.length} trade(s)`,
      detail: `Effective regime: ${overview.marketPolicy.effectiveRegime}.`,
      action: holdings.length > 0 ? 'Monitor exposure limits and drawdown controls.' : 'Set market policy and record holdings/trades when deployed.',
      href: '/market',
    },
    {
      area: 'Operating businesses',
      state: state.engines.length > 0 ? 'GREEN' : 'WATCH',
      status: `${state.engines.length} business(es)`,
      detail: 'Businesses are manager-added; AFH is not seeded by default.',
      action: state.engines.length > 0 ? 'Capture Brand Score inputs each cycle.' : 'Add each business manually before allocating Operating Alpha.',
      href: '/engines',
    },
    {
      area: 'Risk and PCR',
      state: pcrRiskState,
      status: `PCR ${overview.pcr.pcr.toFixed(2)}x; ${overview.riskBreaches} breach(es)`,
      detail: `Liquid assets: ${overview.pcr.liquidAssets.toFixed(2)} GHS.`,
      action: overview.pcr.status === 'PROTECTION_MODE' ? 'Enter protection mode and halt new deployment.' : 'Review dashboard actions before approving deployments.',
      href: '/risk',
    },
    {
      area: 'Audit exports',
      state: hasAuditPack ? 'GREEN' : 'WATCH',
      status: hasAuditPack ? 'Data available' : 'No activity yet',
      detail: 'Audit pack exports cycles, sleeves, investors, ledger, loans, market, stress tests, and audit trail.',
      action: hasAuditPack ? 'Download audit pack after each cycle.' : 'Operational data will appear here after first entries.',
      href: '/audit',
    },
    {
      area: 'Email delivery',
      state: hasEmailProvider ? 'GREEN' : 'WATCH',
      status: hasEmailProvider ? 'Configured' : 'Manual mode',
      detail: hasEmailProvider ? 'Resend is configured for contracts, invoices, receipts, and daily briefs.' : 'Documents can be generated, but email delivery is unavailable.',
      action: hasEmailProvider ? 'Use a consented borrower to send a test document.' : 'Set RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel.',
      href: '/settings#system',
    },
    {
      area: 'WhatsApp delivery',
      state: hasWhatsappProvider ? 'GREEN' : 'WATCH',
      status: hasWhatsappProvider ? 'Configured' : 'Link/manual mode',
      detail: hasWhatsappProvider ? 'Twilio WhatsApp delivery is configured for consented borrowers.' : 'Borrower messages can be generated, but WhatsApp delivery is unavailable.',
      action: hasWhatsappProvider ? 'Use a consented borrower to send a test reminder.' : 'Set all Twilio WhatsApp variables in Vercel.',
      href: '/loans#whatsapp',
    },
  ];
}

export default async function SettingsPage() {
  const { role } = await guardPage('/settings');
  const state = await loadPlatformState();
  const authConnected = isSupabaseConfigured();
  const dbConnected = isDatabaseConfigured();
  const users = await getUsers();
  const fundParams = await loadFundParameters();
  const readinessItems = buildReadinessItems({ state, dbConnected, authConnected, userCount: users.length });
  const blocked = readinessItems.filter((item) => item.state === 'BREACH').length;
  const watch = readinessItems.filter((item) => item.state === 'WATCH').length;
  const ready = readinessItems.filter((item) => item.state === 'GREEN').length;
  const readinessState: RiskState = blocked > 0 ? 'BREACH' : watch > 0 ? 'WATCH' : 'GREEN';

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
        title="Settings"
        description="System configuration, brand assets, connection status, and confirmed financial parameters."
      />
      <PageNav items={[
        { id: 'readiness', label: 'Readiness' },
        { id: 'system', label: 'System' },
        { id: 'brand', label: 'Brand' },
        { id: 'parameters', label: 'Parameters' },
        { id: 'users', label: 'Users' },
        ...(canAccess(role, 'MANAGE_SETTINGS') ? [{ id: 'passwords', label: 'Passwords' }] : []),
        ...(canAccess(role, 'MANAGE_SETTINGS') ? [{ id: 'import', label: 'Import' }] : []),
        ...(canAccess(role, 'MANAGE_SETTINGS') ? [{ id: 'danger', label: 'Reset' }] : []),
      ]} />

      <section id="readiness" className="scroll-mt-24">
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Launch readiness" value={readinessState === 'GREEN' ? 'Ready' : readinessState === 'WATCH' ? 'Watch' : 'Blocked'} state={readinessState} detail={`${ready}/${readinessItems.length} checks ready`} />
          <KpiCard label="Blocked" value={String(blocked)} state={blocked > 0 ? 'BREACH' : 'GREEN'} detail="Must fix before full launch" />
          <KpiCard label="Watch" value={String(watch)} state={watch > 0 ? 'WATCH' : 'GREEN'} detail="Usable, but needs attention" />
          <KpiCard label="Ready" value={String(ready)} state="GREEN" detail="Configured and passing" />
        </div>
        <div className="mt-5">
          <SectionCard
            title="System readiness checklist"
            description="Live launch auditor for setup, capital workflows, lending, market deployment, reporting, and delivery integrations."
            accent={readinessState === 'BREACH' ? 'danger' : readinessState === 'WATCH' ? 'warning' : 'success'}
          >
            <DataTable
              headers={['Area', 'State', 'Status', 'Detail', 'Next action']}
              paginated={false}
              maxHeight="max-h-[640px]"
              rows={readinessItems.map((item) => [
                <Link key="area" href={item.href} className="font-semibold text-brand-black hover:text-brand-navy hover:underline">{item.area}</Link>,
                <StatusBadge key="state" state={item.state}>{item.state}</StatusBadge>,
                <span key="status" className="font-medium">{item.status}</span>,
                <span key="detail" className="text-brand-muted">{item.detail}</span>,
                <span key="action" className="text-brand-charcoal">{item.action}</span>,
              ])}
            />
          </SectionCard>
        </div>
      </section>

      <section id="system" className="scroll-mt-24">
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Mode" value={dbConnected ? 'Live' : 'Seed data'} detail={dbConnected ? 'Supabase Postgres connected' : 'In-memory seed data'} state={dbConnected ? 'GREEN' : 'WATCH'} />
          <KpiCard label="Auth" value={authConnected ? 'Active' : 'Disabled'} detail={authConnected ? 'Supabase Auth' : 'Seed mode bypass'} state={authConnected ? 'GREEN' : 'WATCH'} />
          <KpiCard label="Timezone" value="Africa/Accra" detail="GMT+0" />
          <KpiCard label="Currency" value="GHS" detail="Two decimal display" />
        </div>
        <div className="mt-5">
          <SectionCard title="System status">
            <DataTable
              headers={['Component', 'Status', 'Detail']}
              rows={[
                [
                  'Database',
                  <StatusBadge key="db" state={dbConnected ? 'GREEN' : 'BREACH'}>{dbConnected ? 'Connected' : 'Not connected'}</StatusBadge>,
                  dbConnected ? 'Supabase Postgres connected' : 'Set DATABASE_URL in .env.local',
                ],
                [
                  'Authentication',
                  <StatusBadge key="auth" state={authConnected ? 'GREEN' : 'WATCH'}>{authConnected ? 'Active' : 'Seed mode'}</StatusBadge>,
                  authConnected ? 'Email/password via Supabase Auth' : 'Set NEXT_PUBLIC_SUPABASE_URL',
                ],
                [
                  'Capital partners',
                  `${state.investors.length} partner(s)`,
                  dbConnected ? 'Loaded from persistence layer' : 'Loaded from seed mode',
                ],
                [
                  'Cycles',
                  `${state.cycles.length} cycle(s)`,
                  dbConnected ? 'Loaded from persistence layer' : 'Loaded from seed mode',
                ],
                [
                  'Finance engine',
                  <StatusBadge key="engine" state="GREEN">Operational</StatusBadge>,
                  '9 modules: PCR, NAV, Brand Score, Waterfall, Stress, etc.',
                ],
              ]}
            />
          </SectionCard>
        </div>
      </section>

      <section id="brand" className="scroll-mt-24 mt-5">
        <SectionCard title="Brand system" description="Approved LEJ logo assets and platform color discipline.">
          <div className="space-y-4">
            <div className="rounded-md border border-brand-line bg-brand-black p-4">
              <LogoFull background="dark" className="h-12" />
            </div>
            <div className="flex items-center gap-3 rounded-md border border-brand-line bg-white p-4">
              <LogoIcon background="light" className="h-12 w-12" />
              <div>
                <p className="text-sm font-semibold">LEJ Capital Management</p>
                <p className="text-sm text-brand-muted">Deep navy, black, white, and silver system palette.</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section id="parameters" className="scroll-mt-24 mt-5">
        {canAccess(role, 'MANAGE_SETTINGS') && dbConnected && (
          <SectionCard title="Fund parameters" description="Adjustable parameters that govern cycle returns, loan pricing, and reserve levels.">
            <FundParamsForm params={fundParams} />
          </SectionCard>
        )}
        <div className={canAccess(role, 'MANAGE_SETTINGS') && dbConnected ? 'mt-5' : ''}>
          <SectionCard title="Confirmed financial parameters">
            <DataTable
              headers={['Parameter', 'Value', 'Source']}
              rows={[
                ['Cycle deployment return target', `${fundParams.cycleDeploymentReturn}%`, 'Admin setting'],
                ['Loan rate cap', `${fundParams.loanRateCap}%`, 'Admin setting'],
                ['Reserve floor', `GHS ${Number(fundParams.reserveFloor).toLocaleString()}`, 'Admin setting'],
                ['PCR target band', '1.15x - 1.25x', 'Fund policy'],
                ['PCR warning', '< 1.15x', 'Fund policy'],
                ['PCR protection mode', '< 1.00x', 'Fund policy'],
                ['Loan default cutoff', '90 days past due', 'BoG NPL norm'],
                ['Provision: Current', '1%', 'BoG 7-band'],
                ['Provision: 1-30 days', '1%', 'BoG 7-band'],
                ['Provision: 31-60 days', '10%', 'BoG 7-band'],
                ['Provision: 61-90 days', '10%', 'BoG 7-band'],
                ['Provision: 91-180 days', '25%', 'BoG 7-band'],
                ['Provision: 181-360 days', '50%', 'BoG 7-band'],
                ['Provision: 360+ days', '100%', 'BoG 7-band'],
                ['Validation cap', '15% of Operating Alpha', 'Fund policy'],
                ['GSE ceiling', 'Regime-dependent', 'Fund policy'],
                ['Drawdown halt', '-15% intra-cycle', 'Fund policy'],
              ]}
            />
          </SectionCard>
        </div>
      </section>

      <section id="users" className="scroll-mt-24 mt-5">
        <SectionCard
          title="User management"
          description="Create users and assign roles. Users must have a matching Supabase Auth account to log in."
        >
          {dbConnected ? (
            <>
              <AddUserForm />
              {users.length > 0 && (
                <div className="mt-4">
                  <DataTable
                    headers={['Name', 'Email', 'Role', 'Status', 'Created']}
                    rows={users.map((u: { id: string; name: string; email: string; role: string; active: boolean; createdAt: Date }) => [
                      u.name,
                      u.email,
                      <UserRoleSelect key={`role-${u.id}`} user={{ ...u, createdAt: String(u.createdAt) }} />,
                      <UserActiveToggle key={`active-${u.id}`} user={{ ...u, createdAt: String(u.createdAt) }} />,
                      new Date(u.createdAt).toLocaleDateString('en-GB'),
                    ])}
                  />
                </div>
              )}
              {users.length === 0 && (
                <p className="mt-3 text-sm text-brand-muted">No users created yet. Add a user above to get started.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-brand-muted">User management requires a database connection. Connect to Supabase to manage users.</p>
          )}
        </SectionCard>
      </section>

      {canAccess(role, 'MANAGE_SETTINGS') && (
        <section id="passwords" className="scroll-mt-24 mt-5">
          <SectionCard title="Change password" description="Update the login password for any user account.">
            {authConnected && users.length > 0 ? (
              <ChangePasswordForm users={users.map((u: { email: string }) => ({ email: u.email }))} />
            ) : (
              <p className="text-sm text-brand-muted">
                {!authConnected ? 'Supabase Auth required.' : 'No users to manage yet.'}
              </p>
            )}
          </SectionCard>
        </section>
      )}

      {canAccess(role, 'MANAGE_SETTINGS') && (
        <section id="import" className="scroll-mt-24 mt-5">
          <SectionCard title="Bulk CSV import" description="Upload CSV files to import loans, capital partners, contributions, or market holdings in bulk.">
            <CsvImportSection dbConnected={dbConnected} />
          </SectionCard>
        </section>
      )}

      {canAccess(role, 'MANAGE_SETTINGS') && (
        <section id="danger" className="scroll-mt-24 mt-5">
          <SectionCard title="Danger zone" description="Destructive actions are delayed, permission-gated, and audit-logged.">
            <ResetSystemPanel dbConnected={dbConnected} />
          </SectionCard>
        </section>
      )}
    </>
  );
}
