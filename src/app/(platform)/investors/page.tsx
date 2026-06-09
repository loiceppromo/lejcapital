import { ActionDrawer } from '@/components/app/action-drawer';
import { DataTable } from '@/components/app/data-table';
import { InvestorActionsForm } from '@/components/app/investor-form';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { loadPlatformState } from '@/lib/data/queries';
import { getInvestorPrincipalDue, getInvestorStatements, money } from '@/lib/platform/selectors';

export default async function InvestorsPage() {
  const state = await loadPlatformState();
  const statements = getInvestorStatements(state);

  return (
    <>
      <PageHeader
        title="Investors"
        description="Investor contributions, repayments, PCR at repayment, and read-only statement view."
        action={<ActionDrawer label="Investor actions" title="Investor actions"><InvestorActionsForm /></ActionDrawer>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Investors" value={String(state.investors.length)} />
        <KpiCard label="Principal due" value={money(getInvestorPrincipalDue(state))} />
        <KpiCard label="Repayments recorded" value={String(state.repayments.length)} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Investor list">
          <DataTable
            headers={['Investor', 'Contact', 'Status']}
            rows={state.investors.map((investor) => [
              <span key="name" className="font-medium">{investor.name}</span>,
              investor.contact,
              investor.status,
            ])}
          />
        </SectionCard>
        <SectionCard title="Statements">
          <DataTable
            headers={['Investor', 'Contributed', 'Repaid', 'Standing']}
            rows={statements.map((statement) => [
              <span key="name" className="font-medium">{statement.investor.name}</span>,
              money(statement.totalContributed),
              money(statement.totalRepaid),
              money(statement.currentStanding),
            ])}
          />
        </SectionCard>
      </div>
      <div className="mt-5">
        <SectionCard title="Contributions and repayments">
          <DataTable
            headers={['Type', 'Investor', 'Cycle', 'Amount', 'Date']}
            rows={[
              ...state.contributions.map((entry) => [
                'Contribution',
                state.investors.find((investor) => investor.id === entry.investorId)?.name ?? 'TBC',
                entry.cycleId,
                money(entry.amount),
                entry.dateReceived,
              ]),
              ...state.repayments.map((entry) => [
                'Repayment',
                state.investors.find((investor) => investor.id === entry.investorId)?.name ?? 'TBC',
                entry.cycleId,
                money(entry.amountRepaid),
                entry.repaymentDate,
              ]),
            ]}
          />
        </SectionCard>
      </div>
    </>
  );
}

