import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable } from '@/components/app/data-table';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { loadPlatformState } from '@/lib/data/queries';
import { guardPage } from '@/lib/auth/page-guard';
import { getLoanMetrics, money, pct } from '@/lib/platform/selectors';
import { Decimal } from '@/lib/finance';

export const metadata: Metadata = { title: 'Loan Detail | LEJ Capital' };

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage('/loans');
  const { id } = await params;
  const state = await loadPlatformState();
  const metrics = getLoanMetrics(state);

  const summary = metrics.summaries.find((s) => s.loan.id === id);
  if (!summary) notFound();

  const loan = summary.loan;
  const borrower = summary.borrower;
  const schedule = state.loanSchedules.filter((item) => item.loanId === id);
  const repayments = state.loanRepayments.filter((r) => r.loanId === id);
  const cycle = state.cycles.find((c) => c.id === loan.fundingCycleId);

  const totalPaid = repayments.reduce((sum, r) => sum.plus(r.amountReceived), new Decimal(0));
  const paidPeriods = schedule.filter((s) => s.status === 'PAID').length;
  const overduePeriods = schedule.filter((s) => s.status === 'OVERDUE').length;
  const totalInterestDue = schedule.reduce((sum, s) => sum.plus(s.interestDue), new Decimal(0));
  const totalFeesDue = schedule.reduce((sum, s) => sum.plus(s.feesDue), new Decimal(0));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Loans', href: '/loans' }, { label: borrower?.name ?? 'Loan detail' }]}
        title={`Loan: ${borrower?.name ?? 'Unknown borrower'}`}
        description={`Loan ${id.slice(0, 8)}... · ${loan.termMonths} months · ${loan.interestMethod} interest`}
        action={
          <Link
            href="/loans"
            className="rounded-md border border-brand-line bg-white px-3 py-2 text-sm font-semibold text-brand-black hover:bg-brand-panel"
          >
            Back to loans
          </Link>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Principal" value={money(loan.principal)} detail={`Disbursed ${loan.disbursementDate}`} />
        <KpiCard label="Outstanding" value={money(summary.outstandingPrincipal)} state={summary.outstandingPrincipal.isZero() ? 'GREEN' : undefined} />
        <KpiCard
          label="Status"
          value={loan.status}
          state={loan.status === 'DEFAULTED' ? 'BREACH' : loan.status === 'ACTIVE' ? 'GREEN' : 'WATCH'}
        />
        <KpiCard label="Provision" value={money(summary.provisionAmount)} detail={`${summary.maxDaysPastDue} DPD`} />
      </div>

      {/* Loan details + borrower info */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Loan terms">
          <DataTable
            headers={['Parameter', 'Value']}
            rows={[
              ['Interest rate', pct(loan.interestRate)],
              ['Interest method', loan.interestMethod],
              ['Term', `${loan.termMonths} months`],
              ['Schedule', loan.scheduleType],
              ['Origination fee', `${money(loan.originationFee)} (${loan.originationFeeMethod.replaceAll('_', ' ').toLowerCase()})`],
              ['Repayment order', loan.repaymentAllocOrder.replaceAll('_', ' ')],
              ['Default cutoff', `${loan.defaultCutoffDays} days`],
              ['Collateral', loan.collateralDesc || 'None'],
              ['Collateral value', loan.collateralValue ? money(loan.collateralValue) : 'TBC'],
              ['Funding cycle', cycle ? `Cycle ${cycle.sequenceNo}` : loan.fundingCycleId],
              ['Days past due (max)', `${summary.maxDaysPastDue} days`],
            ]}
          />
        </SectionCard>

        <SectionCard title="Borrower profile" description={borrower ? `${borrower.name} · Risk ${borrower.riskGrade}` : 'No borrower linked'}>
          {borrower ? (
            <DataTable
              headers={['Field', 'Value']}
              rows={[
                ['Name', borrower.name],
                ['Contact', borrower.contact || 'Not provided'],
                ['ID type', borrower.idType],
                ['ID number', borrower.idNumber],
                [
                  'KYC status',
                  <StatusBadge key="kyc" state={borrower.kycStatus === 'VERIFIED' ? 'GREEN' : borrower.kycStatus === 'REJECTED' ? 'BREACH' : 'WATCH'}>
                    {borrower.kycStatus}
                  </StatusBadge>,
                ],
                [
                  'Risk grade',
                  <StatusBadge key="risk" state={['A', 'B'].includes(borrower.riskGrade) ? 'GREEN' : borrower.riskGrade === 'C' ? 'WATCH' : 'BREACH'}>
                    {borrower.riskGrade}
                  </StatusBadge>,
                ],
                ['Notes', borrower.notes || '-'],
              ]}
            />
          ) : (
            <p className="text-sm text-brand-muted">No borrower linked to this loan.</p>
          )}
        </SectionCard>
      </div>

      {/* Repayment summary */}
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <KpiCard label="Total paid" value={money(totalPaid)} />
        <KpiCard label="Paid periods" value={`${paidPeriods} / ${schedule.length}`} state={paidPeriods === schedule.length ? 'GREEN' : undefined} />
        <KpiCard label="Overdue periods" value={String(overduePeriods)} state={overduePeriods > 0 ? 'BREACH' : 'GREEN'} />
        <KpiCard label="Interest + fees due" value={money(totalInterestDue.plus(totalFeesDue))} />
      </div>

      {/* Full amortization schedule */}
      <div className="mt-5">
        <SectionCard title="Amortization schedule" description={`${schedule.length} periods · ${loan.interestMethod} interest`}>
          <DataTable
            headers={['#', 'Due date', 'Principal', 'Interest', 'Fees', 'Total', 'Paid', 'DPD', 'Status']}
            rows={schedule.map((item) => [
              item.period,
              item.dueDate,
              <span key="p" className="font-mono">{money(item.principalDue)}</span>,
              <span key="i" className="font-mono">{money(item.interestDue)}</span>,
              <span key="f" className="font-mono">{money(item.feesDue)}</span>,
              <span key="t" className="font-mono font-semibold">{money(item.totalDue)}</span>,
              <span key="paid" className="font-mono">{money(item.amountPaid)}</span>,
              <span key="dpd" className={item.daysPastDue > 90 ? 'font-semibold text-[#9b2f28]' : item.daysPastDue > 30 ? 'font-semibold text-[#80611a]' : 'text-brand-muted'}>
                {item.daysPastDue}
              </span>,
              <StatusBadge key="status" state={item.status === 'PAID' ? 'GREEN' : item.status === 'OVERDUE' ? 'BREACH' : item.status === 'PARTIAL' ? 'WATCH' : 'NEUTRAL'}>
                {item.status}
              </StatusBadge>,
            ])}
          />
        </SectionCard>
      </div>

      {/* Repayment history */}
      <div className="mt-5">
        <SectionCard title="Repayment history" description={`${repayments.length} repayment(s) recorded`}>
          {repayments.length > 0 ? (
            <DataTable
              headers={['Date', 'Amount', 'To principal', 'To interest', 'To fees']}
              rows={repayments.map((r) => [
                r.dateReceived,
                <span key="amt" className="font-mono font-semibold">{money(r.amountReceived)}</span>,
                <span key="p" className="font-mono">{money(r.allocatedToPrincipal)}</span>,
                <span key="i" className="font-mono">{money(r.allocatedToInterest)}</span>,
                <span key="f" className="font-mono">{money(r.allocatedToFees)}</span>,
              ])}
            />
          ) : (
            <p className="text-sm text-brand-muted">No repayments recorded for this loan.</p>
          )}
        </SectionCard>
      </div>
    </>
  );
}
