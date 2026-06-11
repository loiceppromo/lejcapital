/**
 * WhatsApp message templates for LEJ Capital loan communications.
 *
 * Each function returns a plain-text message ready to be sent via
 * WhatsApp Business API or copied to the clipboard for manual sending.
 *
 * Messages are professional but friendly — they represent the LEJ brand
 * to borrowers who may not be financially sophisticated.
 */

export type MessageType =
  | 'DISBURSEMENT_CONFIRMATION'
  | 'FRIENDLY_REMINDER'
  | 'DUE_DATE_REMINDER'
  | 'LATE_PAYMENT'
  | 'PARTIAL_PAYMENT'
  | 'PAYMENT_RECEIVED'
  | 'FINAL_WARNING'
  | 'FULL_REPAYMENT_THANKS'
  | 'OVERDUE_ESCALATION';

interface BaseInput {
  borrowerName: string;
  loanRef: string;
}

interface DisbursementInput extends BaseInput {
  principal: string;
  netDisbursement: string;
  firstPaymentDate: string;
  monthlyPayment: string;
  termMonths: number;
}

interface ReminderInput extends BaseInput {
  dueDate: string;
  amountDue: string;
  period: number;
  outstanding: string;
}

interface LatePaymentInput extends BaseInput {
  dueDate: string;
  amountDue: string;
  daysPastDue: number;
  period: number;
}

interface PartialPaymentInput extends BaseInput {
  amountReceived: string;
  amountRemaining: string;
  dueDate: string;
  period: number;
}

interface PaymentReceivedInput extends BaseInput {
  amountReceived: string;
  newOutstanding: string;
  period: number;
  nextDueDate: string | null;
  nextAmount: string | null;
}

interface FinalWarningInput extends BaseInput {
  totalOverdue: string;
  daysPastDue: number;
}

interface FullRepaymentInput extends BaseInput {
  totalPaid: string;
}

// ── Template generators ──

export function disbursementConfirmation(input: DisbursementInput): string {
  return `Hello ${input.borrowerName},

Your loan from LEJ Capital has been disbursed.

*Loan Details:*
• Reference: ${input.loanRef}
• Principal: ${input.principal}
• Amount disbursed: ${input.netDisbursement}
• Term: ${input.termMonths} months
• Monthly payment: ${input.monthlyPayment}
• First payment due: ${input.firstPaymentDate}

Please ensure your first payment of ${input.monthlyPayment} is made by ${input.firstPaymentDate}.

If you have any questions about your loan terms, please contact us.

Thank you for choosing LEJ Capital.
_LEJ Capital Management_`;
}

export function friendlyReminder(input: ReminderInput): string {
  return `Hi ${input.borrowerName},

Just a friendly reminder that your next loan payment is coming up.

*Payment ${input.period}:*
• Amount: ${input.amountDue}
• Due date: ${input.dueDate}
• Loan ref: ${input.loanRef}
• Outstanding balance: ${input.outstanding}

Timely payment helps maintain a good credit record with LEJ Capital.

Thank you!
_LEJ Capital Management_`;
}

export function dueDateReminder(input: ReminderInput): string {
  return `Hello ${input.borrowerName},

Your loan payment is *due today*.

• Amount due: ${input.amountDue}
• Due date: ${input.dueDate}
• Loan ref: ${input.loanRef}

Please make your payment at your earliest convenience today to avoid late fees.

Thank you.
_LEJ Capital Management_`;
}

export function latePaymentNotice(input: LatePaymentInput): string {
  return `Hello ${input.borrowerName},

We notice that your loan payment for Period ${input.period} has not yet been received.

*Overdue Details:*
• Amount due: ${input.amountDue}
• Original due date: ${input.dueDate}
• Days overdue: ${input.daysPastDue}
• Loan ref: ${input.loanRef}

Late fees of 2% per 7-day period will apply to overdue amounts. Please make your payment as soon as possible.

If you are experiencing difficulties, please reach out to discuss payment arrangements.

_LEJ Capital Management_`;
}

export function partialPaymentConfirmation(input: PartialPaymentInput): string {
  return `Hello ${input.borrowerName},

Thank you for your partial payment.

• Amount received: ${input.amountReceived}
• Remaining for Period ${input.period}: ${input.amountRemaining}
• Due date: ${input.dueDate}
• Loan ref: ${input.loanRef}

Please settle the remaining ${input.amountRemaining} by the due date to avoid late charges.

_LEJ Capital Management_`;
}

export function paymentReceived(input: PaymentReceivedInput): string {
  const nextLine = input.nextDueDate && input.nextAmount
    ? `\n*Next payment:* ${input.nextAmount} due ${input.nextDueDate}`
    : '';

  return `Hello ${input.borrowerName},

Your payment has been received. Thank you!

• Amount received: ${input.amountReceived}
• For: Period ${input.period}
• Outstanding balance: ${input.newOutstanding}
• Loan ref: ${input.loanRef}${nextLine}

Thank you for your timely payment.
_LEJ Capital Management_`;
}

export function finalWarning(input: FinalWarningInput): string {
  return `IMPORTANT — ${input.borrowerName},

Your loan account with LEJ Capital is severely overdue.

*Overdue Summary:*
• Total overdue: ${input.totalOverdue}
• Days past due: ${input.daysPastDue}
• Loan ref: ${input.loanRef}

This is a final notice before we begin formal collection procedures. The full outstanding balance may be declared immediately due and payable.

Please contact us *within 48 hours* to arrange payment or discuss a restructuring plan.

Failure to respond may result in collateral action and reporting to credit reference bureaus.

_LEJ Capital Management_`;
}

export function fullRepaymentThanks(input: FullRepaymentInput): string {
  return `Dear ${input.borrowerName},

Congratulations! Your loan has been *fully repaid*.

• Total paid: ${input.totalPaid}
• Loan ref: ${input.loanRef}
• Status: *CLOSED*

Thank you for your commitment and reliability. Your excellent repayment record is noted and will be valued for any future loan applications.

We wish you continued success!

Warm regards,
_LEJ Capital Management_`;
}

export function overdueEscalation(input: LatePaymentInput): string {
  return `Hello ${input.borrowerName},

Your loan payment remains unpaid and is now ${input.daysPastDue} days past due.

• Overdue amount: ${input.amountDue}
• Loan ref: ${input.loanRef}
• Late fees continue to accrue.

We strongly urge you to make a payment immediately. If you are unable to pay the full amount, please contact us to discuss a partial payment plan.

_LEJ Capital Management_`;
}

/** Get all message types with labels for UI dropdowns */
export function getMessageTypes(): Array<{ value: MessageType; label: string; description: string }> {
  return [
    { value: 'DISBURSEMENT_CONFIRMATION', label: 'Disbursement confirmation', description: 'Sent when the loan is disbursed to the borrower' },
    { value: 'FRIENDLY_REMINDER', label: 'Friendly reminder', description: 'Sent 3-5 days before the due date' },
    { value: 'DUE_DATE_REMINDER', label: 'Due date reminder', description: 'Sent on the day payment is due' },
    { value: 'LATE_PAYMENT', label: 'Late payment notice', description: 'Sent when payment is 1-30 days past due' },
    { value: 'PARTIAL_PAYMENT', label: 'Partial payment received', description: 'Sent when a partial payment is received' },
    { value: 'PAYMENT_RECEIVED', label: 'Payment confirmation', description: 'Sent after a full instalment is received' },
    { value: 'OVERDUE_ESCALATION', label: 'Overdue escalation', description: 'Sent when payment is 31-60 days past due' },
    { value: 'FINAL_WARNING', label: 'Final warning', description: 'Sent before formal collection begins (60+ days)' },
    { value: 'FULL_REPAYMENT_THANKS', label: 'Full repayment thanks', description: 'Sent when the loan is fully repaid' },
  ];
}
