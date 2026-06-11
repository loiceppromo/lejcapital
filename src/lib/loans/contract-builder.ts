/**
 * Loan Contract Builder for LEJ Capital.
 *
 * Generates professional HTML loan agreements that can be emailed,
 * printed, or saved as PDF. The contract includes all legally
 * relevant terms, repayment schedule, and signature blocks.
 */

import { Decimal } from '@/lib/finance';

export interface ContractInputs {
  /** Borrower information */
  borrowerName: string;
  borrowerContact: string;
  borrowerAddress: string;
  borrowerIdType: string;
  borrowerIdNumber: string;
  borrowerRiskGrade: string;

  /** Loan terms */
  loanId: string;
  principal: Decimal;
  interestRate: Decimal;
  interestMethod: 'FLAT' | 'REDUCING_BALANCE';
  termMonths: number;
  disbursementDate: string;
  firstPaymentDate: string;
  originationFee: Decimal;
  originationFeeMethod: string;
  totalRepayment: Decimal;
  monthlyPayment: Decimal;
  totalInterest: Decimal;

  /** Collateral */
  collateralDesc: string;
  collateralValue: Decimal | null;

  /** Purpose and extras */
  purposeOfLoan: string;

  /** Schedule rows */
  schedule: Array<{
    period: number;
    dueDate: string;
    principalDue: string;
    interestDue: string;
    totalDue: string;
    outstandingAfter: string;
  }>;
}

function money(value: Decimal | string | number): string {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : value.toNumber();
  return `GHS ${num.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateFormat(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function buildLoanContractHTML(inputs: ContractInputs): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const scheduleRows = inputs.schedule
    .map(
      (row) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;font-size:12px;">${row.period}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;font-size:12px;">${dateFormat(row.dueDate)}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;font-size:12px;">${row.principalDue}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;font-size:12px;">${row.interestDue}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;font-weight:600;font-size:12px;">${row.totalDue}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;font-size:12px;">${row.outstandingAfter}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Loan Agreement — ${inputs.loanId}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #052b57; margin: 0 0 4px; font-size: 22px; }
    h2 { color: #052b57; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #052b57; }
    h3 { font-size: 13px; margin: 16px 0 8px; color: #333; }
    p, li { font-size: 13px; }
    .header { text-align: center; border-bottom: 3px solid #052b57; padding-bottom: 20px; margin-bottom: 30px; }
    .header .subtitle { color: #66707c; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0; }
    .header .ref { color: #66707c; font-size: 11px; margin-top: 8px; }
    .terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; }
    .term-row { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 13px; }
    .term-row:nth-child(odd) { background: #f8f9fa; }
    .term-label { color: #66707c; }
    .term-value { font-weight: 600; text-align: right; }
    .sig-block { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .sig-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 6px; font-size: 12px; }
    .clause { margin-bottom: 12px; }
    .clause-num { font-weight: 700; color: #052b57; }
    .highlight { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 4px; padding: 12px; margin: 12px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #052b57; color: white; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  </style>
</head>
<body>
  <div class="header">
    <h1>LEJ Capital Management</h1>
    <p class="subtitle">Private Capital Facility — Loan Agreement</p>
    <p class="ref">Agreement Ref: ${inputs.loanId} · Date: ${today}</p>
  </div>

  <h2>1. Parties</h2>
  <div>
    <div class="term-row"><span class="term-label">Lender</span><span class="term-value">LEJ Capital Management</span></div>
    <div class="term-row"><span class="term-label">Borrower</span><span class="term-value">${inputs.borrowerName}</span></div>
    <div class="term-row"><span class="term-label">Contact</span><span class="term-value">${inputs.borrowerContact}</span></div>
    <div class="term-row"><span class="term-label">Address</span><span class="term-value">${inputs.borrowerAddress || 'On file'}</span></div>
    <div class="term-row"><span class="term-label">ID Type</span><span class="term-value">${inputs.borrowerIdType}</span></div>
    <div class="term-row"><span class="term-label">ID Number</span><span class="term-value">${inputs.borrowerIdNumber}</span></div>
  </div>

  <h2>2. Loan Terms</h2>
  <div>
    <div class="term-row"><span class="term-label">Principal amount</span><span class="term-value">${money(inputs.principal)}</span></div>
    <div class="term-row"><span class="term-label">Annual interest rate</span><span class="term-value">${inputs.interestRate.times(100).toFixed(2)}%</span></div>
    <div class="term-row"><span class="term-label">Interest method</span><span class="term-value">${inputs.interestMethod === 'FLAT' ? 'Flat rate' : 'Reducing balance'}</span></div>
    <div class="term-row"><span class="term-label">Term</span><span class="term-value">${inputs.termMonths} month${inputs.termMonths > 1 ? 's' : ''}</span></div>
    <div class="term-row"><span class="term-label">Disbursement date</span><span class="term-value">${dateFormat(inputs.disbursementDate)}</span></div>
    <div class="term-row"><span class="term-label">First payment date</span><span class="term-value">${dateFormat(inputs.firstPaymentDate)}</span></div>
    <div class="term-row"><span class="term-label">Origination fee</span><span class="term-value">${money(inputs.originationFee)} (${inputs.originationFeeMethod === 'DEDUCT_FROM_DISBURSEMENT' ? 'deducted from disbursement' : 'added to balance'})</span></div>
    <div class="term-row"><span class="term-label">Monthly payment</span><span class="term-value">${money(inputs.monthlyPayment)}</span></div>
    <div class="term-row"><span class="term-label">Total interest</span><span class="term-value">${money(inputs.totalInterest)}</span></div>
    <div class="term-row" style="background:#edf5f1;"><span class="term-label" style="font-weight:700;">Total repayment due</span><span class="term-value" style="color:#052b57;font-size:15px;">${money(inputs.totalRepayment)}</span></div>
    <div class="term-row"><span class="term-label">Purpose of loan</span><span class="term-value">${inputs.purposeOfLoan || 'General business'}</span></div>
  </div>

  <h2>3. Collateral</h2>
  <div>
    <div class="term-row"><span class="term-label">Collateral description</span><span class="term-value">${inputs.collateralDesc || 'None pledged'}</span></div>
    <div class="term-row"><span class="term-label">Estimated value</span><span class="term-value">${inputs.collateralValue ? money(inputs.collateralValue) : 'N/A'}</span></div>
  </div>

  <h2>4. Repayment Schedule</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:center;width:40px;">#</th>
        <th>Due Date</th>
        <th style="text-align:right;">Principal</th>
        <th style="text-align:right;">Interest</th>
        <th style="text-align:right;">Total Due</th>
        <th style="text-align:right;">Outstanding</th>
      </tr>
    </thead>
    <tbody>
      ${scheduleRows}
    </tbody>
  </table>

  <h2>5. Late Payment Policy</h2>
  <div class="highlight">
    <p style="margin:0;font-size:13px;"><strong>Late fee:</strong> A penalty of 2% of the overdue instalment is applied for each 7-day period (or part thereof) that a payment remains unpaid after its due date.</p>
    <p style="margin:8px 0 0;font-size:13px;"><strong>Default:</strong> If any instalment is more than 90 days past due, the Lender may declare the entire outstanding balance immediately due and payable. Collateral may be seized and liquidated per clause 3 above.</p>
    <p style="margin:8px 0 0;font-size:13px;"><strong>Collections:</strong> The Lender reserves the right to engage third-party collection agents. All collection costs shall be borne by the Borrower.</p>
  </div>

  <h2>6. General Conditions</h2>
  <div>
    <p class="clause"><span class="clause-num">6.1</span> The Borrower shall use the loan proceeds solely for the stated purpose. Misuse constitutes a breach entitling the Lender to immediate recall.</p>
    <p class="clause"><span class="clause-num">6.2</span> The Borrower consents to the Lender verifying any information provided and contacting the Borrower via phone, email, or WhatsApp for payment reminders and communications.</p>
    <p class="clause"><span class="clause-num">6.3</span> Early repayment is permitted at any time without penalty. Partial early repayments are applied to outstanding principal.</p>
    <p class="clause"><span class="clause-num">6.4</span> This agreement is governed by the laws of the Republic of Ghana.</p>
    <p class="clause"><span class="clause-num">6.5</span> Amendments to this agreement must be in writing and signed by both parties.</p>
  </div>

  <h2>7. Borrower Declaration</h2>
  <p style="font-size:13px;">I, <strong>${inputs.borrowerName}</strong>, hereby confirm that:</p>
  <ul style="font-size:13px;">
    <li>The information provided is true and correct.</li>
    <li>I have read, understood, and agreed to all terms of this agreement.</li>
    <li>I will repay the loan according to the schedule above.</li>
    <li>I attach a copy of my identification document (${inputs.borrowerIdType}: ${inputs.borrowerIdNumber}).</li>
  </ul>

  <h2>8. Signatures</h2>
  <div class="sig-block">
    <div>
      <p style="font-size:12px;font-weight:600;margin:0 0 4px;">Borrower</p>
      <div class="sig-line">
        <p style="margin:0;">Name: ${inputs.borrowerName}</p>
        <p style="margin:4px 0 0;">Date: ________________</p>
        <p style="margin:4px 0 0;">Signature: ________________</p>
      </div>
    </div>
    <div>
      <p style="font-size:12px;font-weight:600;margin:0 0 4px;">LEJ Capital Management</p>
      <div class="sig-line">
        <p style="margin:0;">Name: ________________</p>
        <p style="margin:4px 0 0;">Date: ________________</p>
        <p style="margin:4px 0 0;">Signature: ________________</p>
      </div>
    </div>
  </div>

  <div style="margin-top:40px;text-align:center;">
    <p style="font-size:10px;color:#66707c;border-top:1px solid #e4e7eb;padding-top:12px;">
      LEJ Capital Management · Private Capital Facility · Accra, Ghana<br>
      This document is confidential and intended solely for the named Borrower.
    </p>
  </div>

  <div style="margin-top:20px;page-break-before:always;">
    <h2>Appendix: Proof of Identity</h2>
    <div style="border:2px dashed #d1d5db;border-radius:8px;padding:40px;text-align:center;color:#66707c;font-size:13px;">
      <p style="margin:0 0 8px;">Attach a clear copy of borrower identification document here.</p>
      <p style="margin:0;font-size:11px;">Accepted: National ID, Passport, Driver's License, Voter's ID</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build a plain-text loan invoice for a specific instalment.
 */
export function buildInstallmentInvoice(inputs: {
  borrowerName: string;
  loanId: string;
  period: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  feesDue: string;
  totalDue: string;
  outstandingAfterPayment: string;
}): { subject: string; html: string } {
  const subject = `[LEJ Capital] Payment Due — ${inputs.borrowerName} · Period ${inputs.period}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f6f7f8;font-family:Inter,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="margin:0;font-size:18px;font-weight:700;color:#052b57;">LEJ Capital</h1>
    <p style="margin:4px 0 0;font-size:11px;color:#66707c;text-transform:uppercase;letter-spacing:1px;">Payment Invoice</p>
  </div>
  <div style="background:#ffffff;border:1px solid #e4e7eb;border-radius:8px;padding:24px;">
    <p style="margin:0 0 4px;font-size:14px;color:#2f343b;">Dear <strong>${inputs.borrowerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#2f343b;">Your instalment payment is due. Please find the details below.</p>

    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="padding:10px 0;color:#66707c;">Loan reference</td><td style="padding:10px 0;font-weight:600;text-align:right;">${inputs.loanId}</td></tr>
      <tr><td style="padding:10px 0;color:#66707c;border-top:1px solid #e4e7eb;">Instalment</td><td style="padding:10px 0;font-weight:600;text-align:right;border-top:1px solid #e4e7eb;">Period ${inputs.period}</td></tr>
      <tr><td style="padding:10px 0;color:#66707c;border-top:1px solid #e4e7eb;">Due date</td><td style="padding:10px 0;font-weight:600;text-align:right;border-top:1px solid #e4e7eb;">${dateFormat(inputs.dueDate)}</td></tr>
      <tr><td style="padding:10px 0;color:#66707c;border-top:1px solid #e4e7eb;">Principal</td><td style="padding:10px 0;font-weight:600;text-align:right;border-top:1px solid #e4e7eb;">${inputs.principalDue}</td></tr>
      <tr><td style="padding:10px 0;color:#66707c;border-top:1px solid #e4e7eb;">Interest</td><td style="padding:10px 0;font-weight:600;text-align:right;border-top:1px solid #e4e7eb;">${inputs.interestDue}</td></tr>
      ${inputs.feesDue !== 'GHS 0.00' ? `<tr><td style="padding:10px 0;color:#66707c;border-top:1px solid #e4e7eb;">Fees</td><td style="padding:10px 0;font-weight:600;text-align:right;border-top:1px solid #e4e7eb;">${inputs.feesDue}</td></tr>` : ''}
      <tr style="background:#edf5f1;"><td style="padding:12px 8px;font-weight:700;font-size:14px;color:#052b57;">Total due</td><td style="padding:12px 8px;font-weight:700;font-size:16px;text-align:right;color:#052b57;">${inputs.totalDue}</td></tr>
    </table>

    <p style="margin:16px 0 0;font-size:12px;color:#66707c;">After this payment, your outstanding balance will be <strong>${inputs.outstandingAfterPayment}</strong>.</p>
    <p style="margin:12px 0 0;font-size:12px;color:#66707c;">Please ensure payment is made by the due date. Late payments attract a penalty of 2% per 7-day period.</p>
  </div>
  <div style="text-align:center;margin-top:16px;">
    <p style="font-size:11px;color:#66707c;margin:0;">LEJ Capital Management · Accra, Ghana</p>
  </div>
</div>
</body>
</html>`;

  return { subject, html };
}
