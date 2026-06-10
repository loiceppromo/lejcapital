import type { Metadata } from 'next';
import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { InvestorActionsForm } from '@/components/app/investor-form';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { Decimal } from '@/lib/finance';
import { getInvestorPrincipalDue, getInvestorStatements, money } from '@/lib/platform/selectors';
import { guardPage } from '@/lib/auth/page-guard';
import { canAccess } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Investors | LEJ Capital' };

export default async function InvestorsPage() {
  const { role } = await guardPage('/investors');
  const state = await loadPlatformState();
  const statements = getInvestorStatements(state);
  const totalContributed = statements.reduce((sum, statement) => sum.plus(statement.totalContributed), new Decimal(0));
  const totalRepaid = statements.reduce((sum, statement) => sum.plus(statement.totalRepaid), new Decimal(0));
  const investorOptions = state.investors.map((investor) => ({
    id: investor.id,
    label: `${investor.name} · ${investor.status}`,
  }));
  const cycleOptions = state.cycles.map((cycle) => ({
    id: cycle.id,
    label: `Cycle ${cycle.sequenceNo} · ${cycle.status}`,
  }));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Investors' }]}
        title="Investors"
        description="Investor contributions, repayments, PCR at repayment, and read-only statement view."
        action={canAccess(role, 'ADD_INVESTOR') ? <ActionDrawer label="Investor actions" title="Investor actions"><InvestorActionsForm investors={investorOptions} cycles={cycleOptions} /></ActionDrawer> : undefined}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Investors" value={String(state.investors.length)} />
        <KpiCard label="Principal due" value={money(getInvestorPrincipalDue(state))} />
        <KpiCard label="Contributed" value={money(totalContributed)} />
        <KpiCard label="Repayments recorded" value={String(state.repayments.length)} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Investor list" description="Registered investors and account standing.">
          <DataTable
            headers={['Investor', 'Contact', 'Status']}
            rows={state.investors.map((investor) => [
              <span key="name" className="font-medium">{investor.name}</span>,
              <span key="contact" className="text-brand-muted">{investor.contact || 'TBC'}</span>,
              <StatusBadge key="status" state={investor.status === 'ACTIVE' ? 'GREEN' : 'NEUTRAL'}>{investor.status}</StatusBadge>,
            ])}
          />
        </SectionCard>
        <SectionCard title="Statements" description={`Total repaid: ${money(totalRepaid)}.`}>
          <DataTable
            headers={['Investor', 'Contributed', 'Repaid', 'Standing']}
            rows={statements.map((statement) => [
              <span key="name" className="font-medium">{statement.investor.name}</span>,
              <span key="contributed" className="font-mono">{money(statement.totalContributed)}</span>,
              <span key="repaid" className="font-mono">{money(statement.totalRepaid)}</span>,
              <span key="standing" className="font-mono font-semibold">{money(statement.currentStanding)}</span>,
            ])}
          />
        </SectionCard>
      </div>
      <div className="mt-5">
        <SectionCard title="Contributions and repayments" description="Append-only investor capital movements by cycle.">
          <DataTable
            headers={['Type', 'Investor', 'Cycle', 'Amount', 'Date']}
            rows={[
              ...state.contributions.map((entry) => [
                <StatusBadge key="type" state="GREEN">Contribution</StatusBadge>,
                state.investors.find((investor) => investor.id === entry.investorId)?.name ?? 'TBC',
                <span key="cycle" className="font-mono text-xs text-brand-muted">{entry.cycleId}</span>,
                <span key="amount" className="font-mono">{money(entry.amount)}</span>,
                entry.dateReceived,
              ]),
              ...state.repayments.map((entry) => [
                <StatusBadge key="type" state="NEUTRAL">Repayment</StatusBadge>,
                state.investors.find((investor) => investor.id === entry.investorId)?.name ?? 'TBC',
                <span key="cycle" className="font-mono text-xs text-brand-muted">{entry.cycleId}</span>,
                <span key="amount" className="font-mono">{money(entry.amountRepaid)}</span>,
                entry.repaymentDate,
              ]),
            ]}
          />
        </SectionCard>
      </div>
    </>
  );
}
