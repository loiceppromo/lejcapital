/**
 * CSV generation utilities.
 *
 * All monetary values are formatted as plain numbers (no currency symbol)
 * so they open cleanly in Excel / Google Sheets.
 */
import type { Decimal } from '@/lib/finance';

/** Escape a CSV cell value — wraps in quotes if it contains commas, quotes, or newlines */
function escapeCell(value: string): string {
  const safeValue = neutralizeSpreadsheetFormula(value);
  if (safeValue.includes(',') || safeValue.includes('"') || safeValue.includes('\n')) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

function neutralizeSpreadsheetFormula(value: string): string {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

/** Convert a Decimal or number to a plain numeric string with 2 decimal places */
function numStr(value: Decimal | number | null | undefined): string {
  if (value == null) return '';
  const n = typeof value === 'number' ? value : value.toNumber();
  return n.toFixed(2);
}

/** Convert a Decimal or number to a percentage string */
function pctStr(value: Decimal | number | null | undefined): string {
  if (value == null) return '';
  const n = typeof value === 'number' ? value : value.toNumber();
  return (n * 100).toFixed(2) + '%';
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string;
}

/** Build a CSV string from rows and column definitions */
export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((row) =>
    columns.map((col) => escapeCell(col.value(row))).join(',')
  );
  return [header, ...body].join('\n');
}

/** Create a downloadable Response from CSV content */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

// ─── Report-specific column definitions ───

import type {
  MarketHoldingRecord,
  LoanRecord,
  LoanScheduleRecord,
  BorrowerRecord,
  AuditEntry,
  LedgerEntry,
  EngineCycleRecord,
} from '@/lib/platform/types';
import type { InvestorRecord, InvestorContributionRecord } from '@/lib/fund/investors';
import type { FundCycle } from '@/lib/fund/cycles';

export const portfolioColumns: CsvColumn<MarketHoldingRecord>[] = [
  { header: 'ID', value: (r) => r.id },
  { header: 'Cycle ID', value: (r) => r.cycleId },
  { header: 'Instrument', value: (r) => r.instrumentType },
  { header: 'Name', value: (r) => r.name },
  { header: 'Amount Invested', value: (r) => numStr(r.amountInvested) },
  { header: 'Current Value', value: (r) => numStr(r.currentValue) },
  { header: 'Return Rate', value: (r) => pctStr(r.returnRate) },
  { header: 'Purchase Date', value: (r) => r.purchaseDate },
  { header: 'Maturity Date', value: (r) => r.maturityDate ?? '' },
];

export const loanColumns: CsvColumn<LoanRecord>[] = [
  { header: 'Loan ID', value: (r) => r.id },
  { header: 'Borrower ID', value: (r) => r.borrowerId },
  { header: 'Principal', value: (r) => numStr(r.principal) },
  { header: 'Interest Rate', value: (r) => pctStr(r.interestRate) },
  { header: 'Method', value: (r) => r.interestMethod },
  { header: 'Term (months)', value: (r) => String(r.termMonths) },
  { header: 'Disbursement Date', value: (r) => r.disbursementDate },
  { header: 'Status', value: (r) => r.status },
  { header: 'Origination Fee', value: (r) => numStr(r.originationFee) },
  { header: 'Collateral', value: (r) => r.collateralDesc },
  { header: 'Collateral Value', value: (r) => numStr(r.collateralValue) },
  { header: 'Provision', value: (r) => numStr(r.provisionAmount) },
];

export const scheduleColumns: CsvColumn<LoanScheduleRecord>[] = [
  { header: 'Schedule ID', value: (r) => r.id },
  { header: 'Loan ID', value: (r) => r.loanId },
  { header: 'Period', value: (r) => String(r.period) },
  { header: 'Due Date', value: (r) => r.dueDate },
  { header: 'Principal Due', value: (r) => numStr(r.principalDue) },
  { header: 'Interest Due', value: (r) => numStr(r.interestDue) },
  { header: 'Fees Due', value: (r) => numStr(r.feesDue) },
  { header: 'Total Due', value: (r) => numStr(r.totalDue) },
  { header: 'Amount Paid', value: (r) => numStr(r.amountPaid) },
  { header: 'Status', value: (r) => r.status },
  { header: 'Days Past Due', value: (r) => String(r.daysPastDue) },
];

export const borrowerColumns: CsvColumn<BorrowerRecord>[] = [
  { header: 'ID', value: (r) => r.id },
  { header: 'Name', value: (r) => r.name },
  { header: 'Contact', value: (r) => r.contact },
  { header: 'ID Type', value: (r) => r.idType },
  { header: 'ID Number', value: (r) => r.idNumber },
  { header: 'KYC Status', value: (r) => r.kycStatus },
  { header: 'Risk Grade', value: (r) => r.riskGrade },
];

export const investorColumns: CsvColumn<InvestorRecord>[] = [
  { header: 'ID', value: (r) => r.id },
  { header: 'Name', value: (r) => r.name },
  { header: 'Contact', value: (r) => r.contact },
];

export const contributionColumns: CsvColumn<InvestorContributionRecord>[] = [
  { header: 'ID', value: (r) => r.id },
  { header: 'Partner ID', value: (r) => r.investorId },
  { header: 'Cycle ID', value: (r) => r.cycleId },
  { header: 'Amount', value: (r) => numStr(r.amount) },
  { header: 'Date Received', value: (r) => r.dateReceived },
];

export const cycleColumns: CsvColumn<FundCycle>[] = [
  { header: 'ID', value: (r) => r.id },
  { header: 'Sequence', value: (r) => String(r.sequenceNo) },
  { header: 'Start Date', value: (r) => r.startDate },
  { header: 'End Date', value: (r) => r.endDate },
  { header: 'Status', value: (r) => r.status },
  { header: 'Opening NAV', value: (r) => numStr(r.openingNAV) },
  { header: 'Closing NAV', value: (r) => numStr(r.closingNAV) },
];

export const auditColumns: CsvColumn<AuditEntry>[] = [
  { header: 'ID', value: (r) => r.id },
  { header: 'Timestamp', value: (r) => r.createdAt },
  { header: 'Actor', value: (r) => r.actorId },
  { header: 'Action', value: (r) => r.action },
  { header: 'Entity Type', value: (r) => r.entityType },
  { header: 'Entity ID', value: (r) => r.entityId },
];

export const ledgerColumns: CsvColumn<LedgerEntry>[] = [
  { header: 'ID', value: (r) => r.id },
  { header: 'Date', value: (r) => r.date },
  { header: 'Account', value: (r) => r.account },
  { header: 'Description', value: (r) => r.description },
  { header: 'Direction', value: (r) => r.direction },
  { header: 'Amount', value: (r) => numStr(r.amount) },
  { header: 'Source', value: (r) => r.source },
];

export const engineColumns: CsvColumn<EngineCycleRecord>[] = [
  { header: 'Engine Code', value: (r) => r.code },
  { header: 'Engine Name', value: (r) => r.name },
  { header: 'Status', value: (r) => r.status },
  { header: 'Cycle ID', value: (r) => r.cycleId },
  { header: 'Capital Allocated', value: (r) => numStr(r.capitalAllocated) },
  { header: 'Profit Returned', value: (r) => numStr(r.profitReturned) },
  { header: 'ROIC', value: (r) => pctStr(r.roic) },
  { header: 'Cash Conversion', value: (r) => pctStr(r.cashConversion) },
];
