import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { KpiCard } from '@/components/app/kpi-card';
import { PageHeader } from '@/components/app/page-header';
import { SectionCard } from '@/components/app/section-card';
import { StatusBadge } from '@/components/app/status-badge';
import { LoanDocumentDelivery } from '@/components/app/loan-document-delivery';
import { loadPlatformState } from '@/lib/data/queries';
import { guardPage } from '@/lib/auth/page-guard';
import { getLoanMetrics, money, pct } from '@/lib/platform/selectors';
import { Decimal } from '@/lib/finance';
import {
  buildBorrowerMessage,
  buildLoanAgreementDraft,
  buildMailtoUrl,
  buildWhatsAppUrl,
  type BorrowerMessageType,
} from '@/lib/loans/documents';

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
  const agreementDraft = buildLoanAgreementDraft({ loan, borrower, schedule });
  const agreementDownloadHref = `data:text/plain;charset=utf-8,${encodeURIComponent(agreementDraft)}`;
  const messageTypes: Array<{ type: BorrowerMessageType; label: string }> = [
    { type: 'friendly-reminder', label: 'Friendly reminder' },
    { type: 'due-date-reminder', label: 'Due today' },
    { type: 'late-payment', label: 'Late payment' },
    { type: 'partial-payment', label: 'Partial payment' },
    { type: 'payment-confirmation', label: 'Payment confirmation' },
    { type: 'final-warning', label: 'Final warning' },
    { type: 'paid-off-thank-you', label: 'Paid-off thank you' },
  ];

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
            <EmptyState
              title="No borrower linked"
              description="This loan record does not currently have a borrower profile attached."
            />
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

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Agreement draft"
          description="Clean loan contract draft generated from borrower, loan, and schedule data. Review before signing."
          action={
            <a
              href={agreementDownloadHref}
              download={`lej-loan-agreement-${loan.id.slice(0, 8)}.txt`}
              className="rounded-md border border-brand-line bg-white px-3 py-2 text-xs font-semibold text-brand-black hover:bg-brand-panel"
            >
              Download draft
            </a>
          }
        >
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-brand-line bg-brand-panel p-4 text-xs leading-5 text-brand-charcoal">
            {agreementDraft}
          </pre>
        </SectionCard>

        <SectionCard title="Borrower messages" description="WhatsApp/email drafts for reminders, confirmations, and escalation.">
          <DataTable
            headers={['Message', 'Send']}
            rows={messageTypes.map((item) => {
              const message = buildBorrowerMessage({ type: item.type, loan, borrower, schedule });
              const whatsappUrl = borrower ? buildWhatsAppUrl(borrower.contact, message) : null;
              const mailtoUrl = borrower ? buildMailtoUrl(borrower.contact, `LEJ Capital loan - ${item.label}`, message) : null;
              return [
                <span key="label" className="font-medium">{item.label}</span>,
                <span key="send" className="flex flex-wrap gap-2">
                  {whatsappUrl ? (
                    <a className="rounded-md bg-brand-navy px-2 py-1 text-xs font-semibold text-white" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
                  ) : (
                    <span className="rounded-md bg-brand-surface px-2 py-1 text-xs text-brand-muted">WhatsApp TBC</span>
                  )}
                  {mailtoUrl ? (
                    <a className="rounded-md border border-brand-line bg-white px-2 py-1 text-xs font-semibold text-brand-black" href={mailtoUrl}>Email</a>
                  ) : (
                    <span className="rounded-md bg-brand-surface px-2 py-1 text-xs text-brand-muted">Email TBC</span>
                  )}
                </span>,
              ];
            })}
          />
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard title="Document delivery" description="Send the loan contract, next payment invoice, or latest receipt. Delivery requires recorded borrower consent and configured email or WhatsApp providers.">
          <LoanDocumentDelivery loanId={loan.id} canEmail={Boolean(borrower)} canWhatsApp={Boolean(borrower)} consented={Boolean(borrower?.notes?.includes('COMMS_OPT_IN'))} />
        </SectionCard>
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
            <EmptyState
              title="No repayments recorded"
              description="Repayment history will appear here after a payment is captured."
            />
          )}
        </SectionCard>
      </div>
    </>
  );
}
