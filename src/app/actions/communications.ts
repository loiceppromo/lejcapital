'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { Decimal } from '@/lib/finance';
import { buildInstallmentInvoice, buildLoanContractHTML, type ContractInputs } from '@/lib/loans/contract-builder';
import { isEmailConfigured, sendBorrowerLoanEmail, sendBorrowerLoanHtmlEmail } from '@/lib/email/service';
import { isWhatsAppConfigured, sendWhatsAppMessage } from '@/lib/whatsapp/service';
import { writeAuditLog } from './audit';

export type LoanDocumentType = 'CONTRACT' | 'NEXT_INVOICE' | 'LATEST_RECEIPT';
export type DeliveryChannel = 'EMAIL' | 'WHATSAPP';
export interface DeliveryResult { ok: boolean; error?: string; message?: string }

function ghs(value: Decimal) { return `GHS ${value.toNumber().toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function receiptHtml(name: string, loanId: string, amount: Decimal, date: Date, remaining: Decimal) {
  return `Hello ${name},\n\nLEJ Capital confirms receipt of ${ghs(amount)} on ${date.toISOString().slice(0, 10)} for loan ${loanId}. Your remaining principal balance is ${ghs(remaining)}.\n\nThank you.\nLEJ Capital Management`;
}

export async function sendLoanDocument(loanId: string, documentType: LoanDocumentType, channel: DeliveryChannel): Promise<DeliveryResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('ORIGINATE_LOAN');
  const db = await getDb();
  const loan = await db.loan.findUnique({
    where: { id: loanId },
    include: { borrower: true, scheduleItems: { orderBy: { dueDate: 'asc' } }, repayments: { orderBy: { dateReceived: 'desc' } } },
  });
  if (!loan?.borrower) return { ok: false, error: 'Borrower record is required.' };
  if (!loan.borrower.communicationConsent) return { ok: false, error: 'Borrower communication consent is not recorded.' };

  const principal = new Decimal(String(loan.principal));
  const interest = new Decimal(String(loan.interestRate));
  const schedule = loan.scheduleItems;
  const totalRepayment = schedule.reduce((sum, item) => sum.plus(new Decimal(String(item.totalDue))), new Decimal(0));
  const totalInterest = schedule.reduce((sum, item) => sum.plus(new Decimal(String(item.interestDue))), new Decimal(0));
  const principalPaid = loan.repayments.reduce((sum, item) => sum.plus(new Decimal(String(item.allocatedToPrincipal))), new Decimal(0));
  const outstanding = Decimal.max(0, principal.minus(principalPaid));
  const disbursementDate = loan.disbursementDate?.toISOString().slice(0, 10) ?? 'TBC';
  let subject: string;
  let message: string;

  if (documentType === 'CONTRACT') {
    const contract: ContractInputs = {
      borrowerName: loan.borrower.name,
      borrowerContact: loan.borrower.phone ?? loan.borrower.email ?? '',
      borrowerAddress: 'TBC', borrowerIdType: loan.borrower.idType ?? 'TBC', borrowerIdNumber: loan.borrower.idNumber ?? 'TBC', borrowerRiskGrade: loan.borrower.riskGrade ?? 'TBC',
      loanId: loan.id, principal, interestRate: interest, interestMethod: loan.interestMethod, termMonths: loan.termMonths,
      disbursementDate, firstPaymentDate: schedule[0]?.dueDate.toISOString().slice(0, 10) ?? 'TBC',
      originationFee: new Decimal(String(loan.originationFee)), originationFeeMethod: loan.originationFeeMethod,
      totalRepayment, monthlyPayment: new Decimal(String(schedule[0]?.totalDue ?? 0)), totalInterest,
      collateralDesc: loan.collateralDesc ?? '', collateralValue: loan.collateralValue ? new Decimal(String(loan.collateralValue)) : null,
      purposeOfLoan: 'TBC',
      schedule: schedule.map((item, index) => ({ period: index + 1, dueDate: item.dueDate.toISOString().slice(0, 10), principalDue: ghs(new Decimal(String(item.principalDue))), interestDue: ghs(new Decimal(String(item.interestDue))), totalDue: ghs(new Decimal(String(item.totalDue))), outstandingAfter: 'TBC' })),
    };
    subject = `[LEJ Capital] Loan agreement — ${loan.id.slice(0, 8)}`;
    message = buildLoanContractHTML(contract);
  } else if (documentType === 'NEXT_INVOICE') {
    const item = schedule.find((scheduleItem) => new Decimal(String(scheduleItem.amountPaid)).lt(new Decimal(String(scheduleItem.totalDue))));
    if (!item) return { ok: false, error: 'There is no unpaid instalment to invoice.' };
    const invoice = buildInstallmentInvoice({ borrowerName: loan.borrower.name, loanId: loan.id, period: schedule.indexOf(item) + 1, dueDate: item.dueDate.toISOString().slice(0, 10), principalDue: ghs(new Decimal(String(item.principalDue))), interestDue: ghs(new Decimal(String(item.interestDue))), feesDue: ghs(new Decimal(String(item.feesDue))), totalDue: ghs(new Decimal(String(item.totalDue)).minus(new Decimal(String(item.amountPaid)))), outstandingAfterPayment: ghs(outstanding) });
    subject = invoice.subject;
    message = invoice.html;
  } else {
    const repayment = loan.repayments[0];
    if (!repayment) return { ok: false, error: 'There is no repayment receipt to send.' };
    subject = `[LEJ Capital] Payment receipt — ${loan.id.slice(0, 8)}`;
    message = receiptHtml(loan.borrower.name, loan.id, new Decimal(String(repayment.amountReceived)), repayment.dateReceived, outstanding);
  }

  let result: { ok: boolean; messageId?: string; error?: string };
  if (channel === 'EMAIL') {
    if (!loan.borrower.email || !isEmailConfigured()) return { ok: false, error: 'Borrower email or Resend configuration is missing.' };
    result = documentType === 'LATEST_RECEIPT'
      ? await sendBorrowerLoanEmail(loan.borrower.email, subject, message)
      : await sendBorrowerLoanHtmlEmail(loan.borrower.email, subject, message);
  } else {
    if (!loan.borrower.phone || !isWhatsAppConfigured()) return { ok: false, error: 'Borrower phone or Twilio WhatsApp configuration is missing.' };
    // WhatsApp receives a concise notice; full HTML contracts/invoices stay in email.
    result = await sendWhatsAppMessage(loan.borrower.phone, `${subject}\n\nPlease check your email for the document. Contact LEJ Capital if you need assistance.`);
  }
  await writeAuditLog('SEND_LOAN_DOCUMENT', 'Loan', loanId, { documentType, channel, delivered: result.ok, messageId: result.messageId ?? null, error: result.ok ? null : result.error ?? 'Delivery failed' });
  if (!result.ok) return { ok: false, error: result.error ?? 'Document delivery failed.' };
  revalidatePath(`/loans/${loanId}`);
  return { ok: true, message: `${documentType.replaceAll('_', ' ').toLowerCase()} sent by ${channel.toLowerCase()}.` };
}
