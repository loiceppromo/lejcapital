import type { Metadata } from 'next';
import { BrandMark, LogoIcon } from '@/components/brand/logo';
import { CsvImportSection } from '@/components/app/csv-import-section';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { PageNav } from '@/components/app/page-nav';
import { ResetSystemPanel } from '@/components/app/reset-system-panel';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { AddUserForm, UserRoleSelect, UserActiveToggle } from '@/components/app/user-management-form';
import { loadPlatformState } from '@/lib/data/queries';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isDatabaseConfigured } from '@/lib/db';
import { guardPage } from '@/lib/auth/page-guard';
import { canAccess } from '@/lib/auth/roles';
import { getUsers } from '@/app/actions/users';

export const metadata: Metadata = { title: 'Settings | LEJ Capital' };

export default async function SettingsPage() {
  const { role } = await guardPage('/settings');
  const state = await loadPlatformState();
  const authConnected = isSupabaseConfigured();
  const dbConnected = isDatabaseConfigured();
  const users = await getUsers();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
        title="Settings"
        description="System configuration, brand assets, connection status, and confirmed financial parameters."
      />
      <PageNav items={[
        { id: 'system', label: 'System' },
        { id: 'brand', label: 'Brand' },
        { id: 'parameters', label: 'Parameters' },
        { id: 'users', label: 'Users' },
        ...(canAccess(role, 'MANAGE_SETTINGS') ? [{ id: 'import', label: 'Import' }] : []),
        ...(canAccess(role, 'MANAGE_SETTINGS') ? [{ id: 'danger', label: 'Reset' }] : []),
      ]} />

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
                  'Investors',
                  `${state.investors.length} investors`,
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
              <BrandMark background="dark" className="h-12" />
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
        <SectionCard title="Confirmed financial parameters">
          <DataTable
            headers={['Parameter', 'Value', 'Source']}
            rows={[
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
              ['Reserve floor', 'TBC', 'Pending IC input'],
            ]}
          />
        </SectionCard>
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
        <section id="import" className="scroll-mt-24 mt-5">
          <SectionCard title="Bulk CSV import" description="Upload CSV files to import loans, investors, contributions, or market holdings in bulk.">
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
