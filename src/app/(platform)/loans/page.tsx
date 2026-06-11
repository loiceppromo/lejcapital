import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionDrawer } from '@/components/app/action-drawer';
import { BorrowerForm } from '@/components/app/borrower-form';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { LoanOriginationForm } from '@/components/app/loan-origination-form';
import { LoanRepaymentForm } from '@/components/app/loan-repayment-form';
import { PageHeader } from '@/components/app/page-header';
import { PageNav } from '@/components/app/page-nav';
import { PresentationToggle } from '@/components/app/presentation-toggle';
import { PrintHeader } from '@/components/app/print-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { refreshLoanAging } from '@/app/actions/loans';
import { loadPlatformState } from '@/lib/data/queries';
import { getLoanMetrics, getLoanPricingContext, loanAsOfDate, money, pct } from '@/lib/platform/selectors';
import { guardPage } from '@/lib/auth/page-guard';
import { canAccess } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Loan Book | LEJ Capital' };

export default async function LoansPage() {
  const { role } = await guardPage('/loans');
  async function handleRefreshLoanAging(formData: FormData) {
    'use server';
    await refreshLoanAging(formData);
  }

  const state = await loadPlatformState();
  const metrics = getLoanMetrics(state);
  const firstLoan = metrics.summaries[0]?.loan;
  const schedule = firstLoan ? state.loanSchedules.filter((item) => item.loanId === firstLoan.id) : [];
  const defaultedLoans = metrics.summaries.filter((summary) => summary.status === 'DEFAULTED').length;
  const watchLoans = metrics.summaries.filter((summary) => summary.maxDaysPastDue > 30).length;
  const borrowerOptions = state.borrowers.map((borrower) => ({
    id: borrower.id,
    label: `${borrower.name} · KYC ${borrower.kycStatus} · Risk ${borrower.riskGrade}`,
    riskGrade: borrower.riskGrade,
  }));
  const cycleOptions = state.cycles.map((cycle) => ({
    id: cycle.id,
    label: `Cycle ${cycle.sequenceNo} · ${cycle.status}`,
  }));
  const loanOptions = metrics.summaries.map((summary) => ({
    id: summary.loan.id,
    label: `${summary.borrower?.name ?? 'Borrower TBC'} · ${money(summary.outstandingPrincipal)} outstanding`,
  }));
  const scheduleOptions = state.loanSchedules
    .filter((item) => item.status !== 'PAID')
    .map((item) => {
      const loan = metrics.summaries.find((summary) => summary.loan.id === item.loanId);
      return {
        id: item.id,
        label: `${loan?.borrower?.name ?? item.loanId} · Period ${item.period} · Due ${item.dueDate} · ${money(item.totalDue)}`,
      };
    });

  return (
    <>
      <PrintHeader title="Loan Book" subtitle={`${metrics.summaries.length} loans · ${money(metrics.totalOutstanding)} outstanding`} />
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Loans' }]}
        title="LEJ Loans"
        description="Illiquid loan-book deployment, amortization, repayment capture, PAR, and provisioning."
        action={
          <div className="flex gap-2">
            <PresentationToggle />
            <form action={handleRefreshLoanAging}>
              <button className="rounded-md border border-brand-line bg-white px-3 py-2 text-sm font-semibold text-brand-black hover:bg-brand-panel">
                Refresh aging
              </button>
            </form>
            {canAccess(role, 'ADD_BORROWER') && <ActionDrawer label="Add borrower" title="New borrower"><BorrowerForm /></ActionDrawer>}
            {canAccess(role, 'ORIGINATE_LOAN') && <ActionDrawer label="Originate loan" title="Loan origination"><LoanOriginationForm borrowers={borrowerOptions} cycles={cycleOptions} pricingContext={getLoanPricingContext(state)} /></ActionDrawer>}
            {canAccess(role, 'RECORD_LOAN_REPAYMENT') && <ActionDrawer label="Record repayment" title="Loan repayment"><LoanRepaymentForm loans={loanOptions} scheduleItems={scheduleOptions} /></ActionDrawer>}
          </div>
        }
      />
      <PageNav items={[
        { id: 'overview', label: 'Overview' },
        { id: 'book', label: 'Loan book' },
        { id: 'borrowers', label: 'Borrowers' },
        { id: 'schedule', label: 'Schedule' },
      ]} />

      <section id="overview" className="scroll-mt-24">
        <div className="kpi-scroll-row grid gap-4 md:grid-cols-4">
          <KpiCard label="Outstanding" value={money(metrics.totalOutstanding)} />
          <KpiCard label="Net loan value" value={money(metrics.netValue)} detail="Outstanding less provisions" />
          <KpiCard label="PAR > 30" value={pct(metrics.par30)} state={metrics.par30.lte('0.05') ? 'GREEN' : 'WATCH'} />
          <KpiCard label="Default rate" value={pct(metrics.defaultRate)} state={metrics.defaultRate.isZero() ? 'GREEN' : 'BREACH'} />
        </div>
        <div className="mt-5">
          <SectionCard title="Loan risk controls" description="Illiquid principal is excluded from PCR liquid assets. Provisions reduce NAV recoverable value.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="PAR > 90" value={pct(metrics.par90)} state={metrics.par90.isZero() ? 'GREEN' : 'BREACH'} />
              <KpiCard label="Weighted rate" value={pct(metrics.weightedRate)} />
              <KpiCard label="Watch loans" value={String(watchLoans)} state={watchLoans > 0 ? 'WATCH' : 'GREEN'} />
              <KpiCard label="Defaulted" value={String(defaultedLoans)} state={defaultedLoans > 0 ? 'BREACH' : 'GREEN'} />
            </div>
          </SectionCard>
        </div>
      </section>

      <section id="book" className="scroll-mt-24 mt-5">
        <SectionCard title="Loan book" description={`Aging and provisioning as of ${loanAsOfDate}.`}>
          <DataTable
            headers={['Borrower', 'Principal', 'Outstanding', 'Provision', 'Status', 'Aging']}
            rows={metrics.summaries.map((summary) => [
              <Link key="borrower" href={`/loans/${summary.loan.id}`} className="font-medium text-brand-navy hover:underline">{summary.borrower?.name ?? 'TBC'}</Link>,
              <span key="principal" className="font-mono">{money(summary.loan.principal)}</span>,
              <span key="outstanding" className="font-mono font-semibold">{money(summary.outstandingPrincipal)}</span>,
              <span key="provision" className="font-mono">{money(summary.provisionAmount)}</span>,
              <StatusBadge key="status" state={summary.status === 'DEFAULTED' ? 'BREACH' : summary.status === 'ACTIVE' ? 'GREEN' : 'NEUTRAL'}>{summary.status}</StatusBadge>,
              <span key="aging" className={summary.maxDaysPastDue > 90 ? 'font-semibold text-[#9b2f28]' : summary.maxDaysPastDue > 30 ? 'font-semibold text-[#80611a]' : 'text-brand-muted'}>
                {summary.maxDaysPastDue} days
              </span>,
            ])}
          />
        </SectionCard>
      </section>

      <section id="borrowers" className="scroll-mt-24 mt-5">
        <SectionCard title="Borrowers">
          <DataTable
            headers={['Name', 'KYC', 'Risk', 'ID']}
            rows={state.borrowers.map((borrower) => [
              <span key="name" className="font-medium">{borrower.name}</span>,
              <StatusBadge key="kyc" state={borrower.kycStatus === 'VERIFIED' ? 'GREEN' : borrower.kycStatus === 'REJECTED' ? 'BREACH' : 'WATCH'}>{borrower.kycStatus}</StatusBadge>,
              <StatusBadge key="risk" state={['A', 'B'].includes(borrower.riskGrade) ? 'GREEN' : borrower.riskGrade === 'C' ? 'WATCH' : 'BREACH'}>{borrower.riskGrade}</StatusBadge>,
              <span key="id" className="font-mono text-xs text-brand-muted">{borrower.idNumber}</span>,
            ])}
          />
        </SectionCard>
      </section>

      <section id="schedule" className="scroll-mt-24 mt-5">
        <SectionCard title="Amortization schedule" description={firstLoan ? `Current loan: ${firstLoan.id}` : 'No active loan selected.'}>
          <DataTable
            headers={['Period', 'Due date', 'Principal', 'Interest', 'Total', 'Paid', 'Status']}
            rows={schedule.map((item) => [
              item.period,
              item.dueDate,
              <span key="principal" className="font-mono">{money(item.principalDue)}</span>,
              <span key="interest" className="font-mono">{money(item.interestDue)}</span>,
              <span key="total" className="font-mono font-semibold">{money(item.totalDue)}</span>,
              <span key="paid" className="font-mono">{money(item.amountPaid)}</span>,
              <StatusBadge key="status" state={item.status === 'PAID' ? 'GREEN' : item.status === 'OVERDUE' ? 'BREACH' : item.status === 'PARTIAL' ? 'WATCH' : 'NEUTRAL'}>{item.status}</StatusBadge>,
            ])}
          />
        </SectionCard>
      </section>
    </>
  );
}
