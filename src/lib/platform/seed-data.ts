import { Decimal, generateSchedule } from '@/lib/finance';
import type {
  AuditEntry,
  BorrowerRecord,
  EngineCycleRecord,
  LedgerEntry,
  LoanRecord,
  LoanScheduleRecord,
  PlatformState,
} from './types';

export const loanAsOfDate = '2026-09-15';

function buildLoanSchedule(loan: LoanRecord, asOfDate = loanAsOfDate): LoanScheduleRecord[] {
  return generateSchedule({
    principal: loan.principal,
    annualRate: loan.interestRate,
    termMonths: loan.termMonths,
    method: loan.interestMethod,
    disbursementDate: new Date(loan.disbursementDate),
  }).map((item) => {
    const daysPastDue = Math.max(
      0,
      Math.floor((new Date(asOfDate).getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      id: `${loan.id}-schedule-${item.period}`,
      loanId: loan.id,
      period: item.period,
      dueDate: item.dueDate.toISOString().slice(0, 10),
      principalDue: item.principalDue,
      interestDue: item.interestDue,
      feesDue: item.period === 1 && loan.originationFeeMethod === 'ADD_TO_BALANCE' ? loan.originationFee : new Decimal(0),
      totalDue: item.totalDue.plus(
        item.period === 1 && loan.originationFeeMethod === 'ADD_TO_BALANCE' ? loan.originationFee : new Decimal(0),
      ),
      amountPaid: new Decimal(0),
      status: daysPastDue > 0 ? 'OVERDUE' : 'SCHEDULED',
      daysPastDue,
    };
  });
}

const borrowers: BorrowerRecord[] = [
  {
    id: 'borrower-1',
    name: 'Seed borrower A',
    contact: 'seed-borrower-a@lej.local',
    idType: 'NATIONAL_ID',
    idNumber: 'TBC',
    kycStatus: 'VERIFIED',
    riskGrade: 'B',
    notes: 'Seed-mode borrower record for interface verification.',
  },
];

const loans: LoanRecord[] = [
  {
    id: 'loan-1',
    borrowerId: 'borrower-1',
    principal: new Decimal(18000),
    interestRate: new Decimal('0.30'),
    interestMethod: 'REDUCING_BALANCE',
    termMonths: 6,
    disbursementDate: '2026-07-10',
    scheduleType: 'MONTHLY',
    originationFee: new Decimal(450),
    originationFeeMethod: 'DEDUCT_FROM_DISBURSEMENT',
    repaymentAllocOrder: 'FEES_INTEREST_PRINCIPAL',
    collateralDesc: 'Inventory pledge',
    collateralValue: new Decimal(12000),
    status: 'ACTIVE',
    fundingCycleId: 'cycle-1',
    provisionAmount: new Decimal(180),
    defaultCutoffDays: 90,
  },
];

const engineRecords: EngineCycleRecord[] = [
  {
    id: 'engine-cycle-1',
    cycleId: 'cycle-1',
    code: 'UNDC',
    name: 'UNDC',
    status: 'ACTIVE',
    capitalAllocated: new Decimal(0),
    profitReturned: null,
    roic: new Decimal('0.78'),
    cashConversion: new Decimal('0.86'),
    sellThrough: new Decimal('0.82'),
    repeatDemand: new Decimal('0.74'),
    operationalRisk: new Decimal('0.42'),
    validationGate: false,
    defectRate: new Decimal('0.02'),
    refundRate: new Decimal('0.01'),
    productionDelays: 1,
    salesVsTarget: new Decimal('0.88'),
    sellThroughRate: null,
  },
  {
    id: 'engine-cycle-2',
    cycleId: 'cycle-1',
    code: 'AFH',
    name: 'AFH',
    status: 'VALIDATION',
    capitalAllocated: new Decimal(0),
    profitReturned: null,
    roic: null,
    cashConversion: null,
    sellThrough: null,
    repeatDemand: null,
    operationalRisk: null,
    validationGate: true,
    defectRate: null,
    refundRate: null,
    productionDelays: null,
    salesVsTarget: null,
    sellThroughRate: null,
  },
];

const auditEntries: AuditEntry[] = [
  {
    id: 'audit-1',
    actorId: 'fund-manager-seed',
    action: 'SYSTEM_BOOTSTRAP',
    entityType: 'APPLICATION',
    entityId: 'lej-capital-management',
    before: 'TBC',
    after: 'Seed-mode operating state loaded.',
    createdAt: '2026-06-09T00:00:00.000Z',
  },
  {
    id: 'audit-2',
    actorId: 'fund-manager-seed',
    action: 'SIZE_SLEEVES',
    entityType: 'Sleeve',
    entityId: 'cycle-1',
    before: 'TBC',
    after: 'Seed sleeve structure sized.',
    createdAt: '2026-06-09T00:10:00.000Z',
  },
];

const ledgerEntries: LedgerEntry[] = [
  {
    id: 'ledger-1',
    date: '2026-07-01',
    account: 'Investor capital',
    description: 'Seed investor contribution',
    direction: 'IN',
    amount: new Decimal(45000),
    source: 'InvestorContribution',
  },
  {
    id: 'ledger-2',
    date: '2026-07-01',
    account: 'Investor capital',
    description: 'Seed investor contribution',
    direction: 'IN',
    amount: new Decimal(55000),
    source: 'InvestorContribution',
  },
  {
    id: 'ledger-3',
    date: '2026-07-10',
    account: 'Loan book',
    description: 'Seed loan disbursement',
    direction: 'OUT',
    amount: new Decimal(18000),
    source: 'Loan',
  },
];

export const platformState: PlatformState = {
  mode: 'SEED',
  activeCycleId: 'cycle-1',
  requestedRegime: 'NORMAL',
  cycles: [
    {
      id: 'cycle-1',
      sequenceNo: 1,
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      status: 'ACTIVE',
      openingNAV: new Decimal(100000),
      closingNAV: null,
      retainedCapital: null,
      notes: 'Seed-mode cycle. Replace with persisted cycle data before production use.',
    },
  ],
  sleevesByCycle: {
    'cycle-1': [
      {
        type: 'PROTECTION',
        targetAmount: new Decimal(125000),
        fundedAmount: new Decimal(65000),
        floorAmount: null,
        notes: 'Protection sleeve. Seed value only.',
      },
      {
        type: 'RESERVE',
        targetAmount: new Decimal(7500),
        fundedAmount: new Decimal(7500),
        floorAmount: new Decimal(7500),
        notes: 'Reserve floor remains configurable.',
      },
      {
        type: 'OPERATING_ALPHA',
        targetAmount: new Decimal(14500),
        fundedAmount: new Decimal(14500),
        floorAmount: null,
        notes: 'Investor-contribution funded only.',
      },
      {
        type: 'MARKET_ALPHA',
        targetAmount: new Decimal(40000),
        fundedAmount: new Decimal(22000),
        floorAmount: null,
        notes: 'Market deployment net of loan-book allocation.',
      },
      {
        type: 'LOAN_BOOK',
        targetAmount: new Decimal(18000),
        fundedAmount: new Decimal(18000),
        floorAmount: null,
        notes: 'Illiquid loan-book deployment.',
      },
    ],
  },
  investors: [
    { id: 'investor-1', name: 'Seed Investor A', contact: 'seed-investor-a@lej.local', status: 'ACTIVE' },
    { id: 'investor-2', name: 'Seed Investor B', contact: 'seed-investor-b@lej.local', status: 'ACTIVE' },
  ],
  contributions: [
    {
      id: 'contribution-1',
      investorId: 'investor-1',
      cycleId: 'cycle-1',
      amount: new Decimal(45000),
      dateReceived: '2026-07-01',
    },
    {
      id: 'contribution-2',
      investorId: 'investor-2',
      cycleId: 'cycle-1',
      amount: new Decimal(55000),
      dateReceived: '2026-07-01',
    },
  ],
  repayments: [],
  marketHoldings: [
    {
      id: 'holding-1',
      cycleId: 'cycle-1',
      instrumentType: 'GSE_EQUITY',
      name: 'MTNGH',
      amountInvested: new Decimal(14000),
      currentValue: new Decimal(14200),
      returnRate: new Decimal('0.014286'),
      maturityDate: null,
      purchaseDate: '2026-07-05',
    },
    {
      id: 'holding-2',
      cycleId: 'cycle-1',
      instrumentType: 'TBILL',
      name: '91D T-Bill',
      amountInvested: new Decimal(18000),
      currentValue: new Decimal(18486),
      returnRate: new Decimal('0.027'),
      maturityDate: '2026-09-20',
      purchaseDate: '2026-07-02',
    },
    {
      id: 'holding-3',
      cycleId: 'cycle-1',
      instrumentType: 'CASH',
      name: 'Broker cash',
      amountInvested: new Decimal(4200),
      currentValue: new Decimal(4200),
      returnRate: new Decimal(0),
      maturityDate: null,
      purchaseDate: '2026-07-01',
    },
  ],
  borrowers,
  loans,
  loanSchedules: loans.flatMap((loan) => buildLoanSchedule(loan)),
  loanRepayments: [],
  engineRecords,
  auditEntries,
  icDecisions: [
    {
      id: 'ic-1',
      cycleId: 'cycle-1',
      position: 'AFH',
      decision: 'MAINTAIN',
      rationale: 'Validation cap remains until sell-through data is resolved.',
      createdAt: '2026-06-09T00:20:00.000Z',
    },
  ],
  ledgerEntries,
  waterfallRuns: [],
  opportunisticTriggers: [],
};
