import { describe, expect, it } from 'vitest';
import { Decimal } from '@/lib/finance';
import type { BorrowerRecord, LoanRecord, LoanScheduleRecord } from '@/lib/platform/types';
import { buildBorrowerMessage, buildLoanAgreementDraft, buildMailtoUrl, buildWhatsAppUrl } from '../documents';

const borrower: BorrowerRecord = {
  id: 'b1',
  name: 'Ama Mensah',
  contact: '+233 24 000 0000',
  idType: 'NATIONAL_ID',
  idNumber: 'GHA-123',
  kycStatus: 'VERIFIED',
  riskGrade: 'B',
  notes: '',
};

const loan: LoanRecord = {
  id: 'l1',
  borrowerId: 'b1',
  principal: new Decimal(10000),
  interestRate: new Decimal('0.24'),
  interestMethod: 'REDUCING_BALANCE',
  termMonths: 2,
  disbursementDate: '2026-07-01',
  scheduleType: 'MONTHLY',
  originationFee: new Decimal(100),
  originationFeeMethod: 'DEDUCT_FROM_DISBURSEMENT',
  repaymentAllocOrder: 'FEES_INTEREST_PRINCIPAL',
  collateralDesc: 'Inventory pledge',
  collateralValue: new Decimal(5000),
  status: 'ACTIVE',
  fundingCycleId: 'cycle-1',
  provisionAmount: new Decimal(100),
  defaultCutoffDays: 90,
};

const schedule: LoanScheduleRecord[] = [
  {
    id: 's1',
    loanId: 'l1',
    period: 1,
    dueDate: '2026-08-01',
    principalDue: new Decimal(5000),
    interestDue: new Decimal(200),
    feesDue: new Decimal(0),
    totalDue: new Decimal(5200),
    amountPaid: new Decimal(0),
    status: 'SCHEDULED',
    daysPastDue: 0,
  },
];

describe('loan document helpers', () => {
  it('builds an agreement draft with borrower and repayment details', () => {
    const draft = buildLoanAgreementDraft({ loan, borrower, schedule, generatedDate: '2026-07-01' });
    expect(draft).toContain('LEJ CAPITAL MANAGEMENT - LOAN AGREEMENT DRAFT');
    expect(draft).toContain('Ama Mensah');
    expect(draft).toContain('GHS 10,000.00');
    expect(draft).toContain('Borrower signature');
  });

  it('builds WhatsApp and email-safe borrower messages', () => {
    const message = buildBorrowerMessage({ type: 'friendly-reminder', loan, borrower, schedule });
    expect(message).toContain('friendly reminder');
    expect(buildWhatsAppUrl(borrower.contact, message)).toContain('https://wa.me/233');
    expect(buildMailtoUrl('borrower@example.com', 'Loan', message)).toContain('mailto:borrower%40example.com');
  });
});
