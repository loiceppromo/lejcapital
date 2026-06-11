import { Decimal } from '@/lib/finance';
import type { BorrowerRecord, LoanRecord, LoanScheduleRecord } from '@/lib/platform/types';

export type BorrowerMessageType =
  | 'friendly-reminder'
  | 'due-date-reminder'
  | 'late-payment'
  | 'partial-payment'
  | 'payment-confirmation'
  | 'final-warning'
  | 'paid-off-thank-you';

function totalRepayment(schedule: LoanScheduleRecord[]): Decimal {
  return schedule.reduce((sum, item) => sum.plus(item.totalDue), new Decimal(0));
}

function formatGhsForDocument(value: Decimal): string {
  const [whole, fraction] = value.toFixed(2).split('.');
  return `GHS ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}

function remainingDue(schedule: LoanScheduleRecord[]): Decimal {
  return schedule.reduce((sum, item) => sum.plus(Decimal.max(0, item.totalDue.minus(item.amountPaid))), new Decimal(0));
}

function nextOpenScheduleItem(schedule: LoanScheduleRecord[]): LoanScheduleRecord | null {
  return schedule.find((item) => item.status !== 'PAID') ?? null;
}

function maturityDate(schedule: LoanScheduleRecord[], loan: LoanRecord): string {
  return schedule.at(-1)?.dueDate ?? loan.disbursementDate;
}

function borrowerIdLine(borrower: BorrowerRecord | undefined): string {
  if (!borrower) return 'TBC';
  return `${borrower.idType || 'ID'}: ${borrower.idNumber || 'TBC'}`;
}

function cleanPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) return `233${digits.slice(1)}`;
  return digits;
}

export function buildLoanAgreementDraft({
  loan,
  borrower,
  schedule,
  generatedDate,
}: {
  loan: LoanRecord;
  borrower?: BorrowerRecord;
  schedule: LoanScheduleRecord[];
  generatedDate?: string;
}): string {
  const totalDue = totalRepayment(schedule);
  const firstDueDate = schedule[0]?.dueDate ?? 'TBC';
  const lastDueDate = maturityDate(schedule, loan);

  return [
    'LEJ CAPITAL MANAGEMENT - LOAN AGREEMENT DRAFT',
    `Generated: ${generatedDate ?? new Date().toISOString().slice(0, 10)}`,
    '',
    '1. PARTIES',
    `Lender: LEJ Capital Management`,
    `Borrower: ${borrower?.name ?? 'TBC'}`,
    `Borrower contact/address: ${borrower?.contact || 'TBC'} / Address TBC`,
    `Borrower ID: ${borrowerIdLine(borrower)}`,
    '',
    '2. LOAN TERMS',
    `Principal amount: ${formatGhsForDocument(loan.principal)}`,
    `Annual interest rate: ${loan.interestRate.times(100).toFixed(2)}%`,
    `Interest method: ${loan.interestMethod.replaceAll('_', ' ')}`,
    `Term: ${loan.termMonths} month(s)`,
    `Disbursement date: ${loan.disbursementDate}`,
    `First repayment date: ${firstDueDate}`,
    `Final repayment date: ${lastDueDate}`,
    `Total scheduled repayment: ${formatGhsForDocument(totalDue)}`,
    `Origination fee: ${formatGhsForDocument(loan.originationFee)} (${loan.originationFeeMethod.replaceAll('_', ' ').toLowerCase()})`,
    '',
    '3. PURPOSE AND COLLATERAL',
    `Purpose of loan: TBC - record in borrower notes or IC decision before signing`,
    `Collateral description: ${loan.collateralDesc || 'TBC'}`,
    `Collateral value: ${loan.collateralValue ? formatGhsForDocument(loan.collateralValue) : 'TBC'}`,
    `Proof attachment: TBC - borrower ID, collateral proof, and signed agreement required`,
    '',
    '4. REPAYMENT AND LATE POLICY',
    `Repayment order: ${loan.repaymentAllocOrder.replaceAll('_', ' ')}`,
    'Late payments may trigger reminder notices, collections review, default classification after 90 days past due, and provisioning under LEJ policy.',
    'Partial payments may be accepted but do not waive the remaining balance unless documented by LEJ Capital Management.',
    '',
    '5. ACKNOWLEDGEMENT',
    'The borrower confirms the terms above, the source of repayment, the accuracy of KYC details, and authorizes LEJ Capital Management to contact them about repayment.',
    '',
    'Borrower signature: ____________________________   Date: ____________',
    'LEJ Capital signature: __________________________   Date: ____________',
  ].join('\n');
}

export function buildBorrowerMessage({
  type,
  loan,
  borrower,
  schedule,
  amountReceived,
}: {
  type: BorrowerMessageType;
  loan: LoanRecord;
  borrower?: BorrowerRecord;
  schedule: LoanScheduleRecord[];
  amountReceived?: Decimal;
}): string {
  const name = borrower?.name ?? 'Borrower';
  const next = nextOpenScheduleItem(schedule);
  const remaining = remainingDue(schedule);
  const totalDue = totalRepayment(schedule);

  switch (type) {
    case 'friendly-reminder':
      return `Hello ${name}, this is a friendly reminder from LEJ Capital. Your next loan payment of ${next ? formatGhsForDocument(next.totalDue.minus(next.amountPaid)) : 'TBC'} is due on ${next?.dueDate ?? 'TBC'}. Thank you.`;
    case 'due-date-reminder':
      return `Hello ${name}, your LEJ Capital loan payment is due today. Amount due: ${next ? formatGhsForDocument(next.totalDue.minus(next.amountPaid)) : 'TBC'}. Please make payment and send proof for confirmation.`;
    case 'late-payment':
      return `Hello ${name}, your LEJ Capital loan payment is overdue. Outstanding scheduled balance is ${formatGhsForDocument(remaining)}. Please pay immediately or contact LEJ Capital to regularize the account.`;
    case 'partial-payment':
      return `Hello ${name}, LEJ Capital has received a partial payment${amountReceived ? ` of ${formatGhsForDocument(amountReceived)}` : ''}. Remaining scheduled balance is ${formatGhsForDocument(remaining)}. Thank you; please continue with the agreed schedule.`;
    case 'payment-confirmation':
      return `Hello ${name}, LEJ Capital confirms receipt of your payment${amountReceived ? ` of ${formatGhsForDocument(amountReceived)}` : ''}. Thank you. Your remaining scheduled balance is ${formatGhsForDocument(remaining)}.`;
    case 'final-warning':
      return `Hello ${name}, this is a final payment notice from LEJ Capital. Your loan is seriously overdue. Outstanding scheduled balance: ${formatGhsForDocument(remaining)}. Please settle immediately to avoid default action.`;
    case 'paid-off-thank-you':
      return `Hello ${name}, thank you. Your LEJ Capital loan of ${formatGhsForDocument(loan.principal)} has been fully repaid against a total scheduled amount of ${formatGhsForDocument(totalDue)}. We appreciate your cooperation.`;
  }
}

export function buildWhatsAppUrl(contact: string, message: string): string | null {
  const phone = cleanPhone(contact);
  if (phone.length < 9) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(contact: string, subject: string, body: string): string | null {
  if (!contact.includes('@')) return null;
  return `mailto:${encodeURIComponent(contact)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
