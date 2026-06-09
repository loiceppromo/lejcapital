import { ActionDrawer } from '@/components/app/action-drawer';
import { BorrowerForm } from '@/components/app/borrower-form';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { LoanOriginationForm } from '@/components/app/loan-origination-form';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { getLoanMetrics, loanAsOfDate, money, pct } from '@/lib/platform/selectors';

export default async function LoansPage() {
  const state = await loadPlatformState();
  const metrics = getLoanMetrics(state);
  const firstLoan = metrics.summaries[0]?.loan;
  const schedule = firstLoan ? state.loanSchedules.filter((item) => item.loanId === firstLoan.id) : [];

  return (
    <>
      <PageHeader
        title="LEJ Loans"
        description="Illiquid loan-book deployment, amortization, repayment capture, PAR, and provisioning."
        action={
          <div className="flex gap-2">
            <ActionDrawer label="Add borrower" title="New borrower"><BorrowerForm /></ActionDrawer>
            <ActionDrawer label="Originate loan" title="Loan origination"><LoanOriginationForm /></ActionDrawer>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Outstanding" value={money(metrics.totalOutstanding)} />
        <KpiCard label="Net loan value" value={money(metrics.netValue)} detail="Outstanding less provisions" />
        <KpiCard label="PAR > 30" value={pct(metrics.par30)} state={metrics.par30.lte('0.05') ? 'GREEN' : 'WATCH'} />
        <KpiCard label="Default rate" value={pct(metrics.defaultRate)} state={metrics.defaultRate.isZero() ? 'GREEN' : 'BREACH'} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Loan book" description={`Aging as of ${loanAsOfDate}.`}>
          <DataTable
            headers={['Borrower', 'Principal', 'Outstanding', 'Provision', 'Status', 'Aging']}
            rows={metrics.summaries.map((summary) => [
              <span key="borrower" className="font-medium">{summary.borrower?.name ?? 'TBC'}</span>,
              money(summary.loan.principal),
              money(summary.outstandingPrincipal),
              money(summary.provisionAmount),
              <StatusBadge key="status" state={summary.status === 'DEFAULTED' ? 'BREACH' : summary.status === 'ACTIVE' ? 'GREEN' : 'NEUTRAL'}>{summary.status}</StatusBadge>,
              `${summary.maxDaysPastDue} days`,
            ])}
          />
        </SectionCard>
        <SectionCard title="Borrowers">
          <DataTable
            headers={['Name', 'KYC', 'Risk', 'ID']}
            rows={state.borrowers.map((borrower) => [
              <span key="name" className="font-medium">{borrower.name}</span>,
              borrower.kycStatus,
              borrower.riskGrade,
              borrower.idNumber,
            ])}
          />
        </SectionCard>
      </div>
      <div className="mt-5">
        <SectionCard title="Amortization preview" description="Selected seed loan schedule; full selection moves into persisted UI state.">
          <DataTable
            headers={['Period', 'Due date', 'Principal', 'Interest', 'Total', 'Paid', 'Status']}
            rows={schedule.map((item) => [
              item.period,
              item.dueDate,
              money(item.principalDue),
              money(item.interestDue),
              money(item.totalDue),
              money(item.amountPaid),
              item.status,
            ])}
          />
        </SectionCard>
      </div>
    </>
  );
}

