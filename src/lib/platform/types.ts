import type { Decimal, InterestMethod, InstrumentType, Regime, RepaymentAllocOrder } from '@/lib/finance';
import type { CycleStatus, FundCycle } from '@/lib/fund/cycles';
import type { InvestorContributionRecord, InvestorRecord, InvestorRepaymentRecord } from '@/lib/fund/investors';

export type SleeveType = 'PROTECTION' | 'RESERVE' | 'OPERATING_ALPHA' | 'MARKET_ALPHA' | 'LOAN_BOOK';
export type MarketInstrumentType = Extract<InstrumentType, 'GSE_EQUITY' | 'TBILL' | 'CASH'>;
export type LoanStatus = 'PENDING' | 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED' | 'WRITTEN_OFF';
export type ScheduleStatus = 'SCHEDULED' | 'PAID' | 'PARTIAL' | 'OVERDUE';
export type OriginationFeeMethod = 'DEDUCT_FROM_DISBURSEMENT' | 'ADD_TO_BALANCE';
export type EngineStatus = 'ACTIVE' | 'VALIDATION' | 'EXITED';
export type RiskState = 'GREEN' | 'WATCH' | 'BREACH';

export interface SleeveRecord {
  type: SleeveType;
  targetAmount: Decimal | null;
  fundedAmount: Decimal;
  floorAmount: Decimal | null;
  notes: string;
}

export interface MarketHoldingRecord {
  id: string;
  cycleId: string;
  instrumentType: MarketInstrumentType;
  name: string;
  amountInvested: Decimal;
  currentValue: Decimal;
  returnRate: Decimal | null;
  maturityDate: string | null;
  purchaseDate: string;
}

export interface BorrowerRecord {
  id: string;
  name: string;
  contact: string;
  idType: string;
  idNumber: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  notes: string;
}

export interface LoanScheduleRecord {
  id: string;
  loanId: string;
  period: number;
  dueDate: string;
  principalDue: Decimal;
  interestDue: Decimal;
  feesDue: Decimal;
  totalDue: Decimal;
  amountPaid: Decimal;
  status: ScheduleStatus;
  daysPastDue: number;
}

export interface LoanRecord {
  id: string;
  borrowerId: string;
  principal: Decimal;
  interestRate: Decimal;
  interestMethod: InterestMethod;
  termMonths: number;
  disbursementDate: string;
  scheduleType: 'MONTHLY';
  originationFee: Decimal;
  originationFeeMethod: OriginationFeeMethod;
  repaymentAllocOrder: RepaymentAllocOrder;
  collateralDesc: string;
  collateralValue: Decimal | null;
  status: LoanStatus;
  fundingCycleId: string;
  provisionAmount: Decimal;
  defaultCutoffDays: number;
}

export interface LoanRepaymentRecord {
  id: string;
  loanId: string;
  scheduleItemId: string | null;
  amountReceived: Decimal;
  dateReceived: string;
  allocatedToPrincipal: Decimal;
  allocatedToInterest: Decimal;
  allocatedToFees: Decimal;
}

export interface EngineCycleRecord {
  id: string;
  engineId?: string;
  cycleId: string;
  code: string;
  name: string;
  status: EngineStatus;
  capitalAllocated: Decimal | null;
  profitReturned: Decimal | null;
  roic: Decimal | null;
  cashConversion: Decimal | null;
  sellThrough: Decimal | null;
  repeatDemand: Decimal | null;
  operationalRisk: Decimal | null;
  validationGate: boolean;
  defectRate: Decimal | null;
  refundRate: Decimal | null;
  productionDelays: number | null;
  salesVsTarget: Decimal | null;
  sellThroughRate: Decimal | null;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: string;
  after: string;
  createdAt: string;
}

export interface ICDecision {
  id: string;
  cycleId: string;
  position: string;
  decision: 'INCREASE' | 'MAINTAIN' | 'REDUCE' | 'EXIT';
  rationale: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  account: string;
  description: string;
  direction: 'IN' | 'OUT';
  amount: Decimal;
  source: string;
  cycleId?: string | null;
}

export interface WaterfallLineRecord {
  id: string;
  waterfallRunId: string;
  priority: number;
  claimType: string;
  amountClaimed: Decimal;
  amountPaid: Decimal;
  fullyPaid: boolean;
  cashAfter: Decimal;
}

export interface WaterfallRunRecord {
  id: string;
  cycleId: string;
  runDate: string;
  totalCashAvailable: Decimal;
  lines: WaterfallLineRecord[];
}

export interface OpportunisticTriggerRecord {
  cycleId: string;
  pcrAbove125: boolean;
  undcDemandValidated: boolean;
  undcDemandRationale: string | null;
  marketCatalystDocumented: boolean;
  marketCatalystRationale: string | null;
  noOpenOperationalIssues: boolean;
  operationalOverride: boolean;
  operationalRationale: string | null;
}

export interface ReportSnapshotRecord {
  id: string;
  key: string;
  snapshotDate: string;
  createdAt: string;
  activeCycle: string;
  cycleStatus: string;
  currentNAV: string;
  pcr: string;
  pcrStatus: string;
  investorPrincipalDue: string;
  netLoanBookValue: string;
  totalProvisions: string;
  marketPortfolioValue: string;
  riskBreaches: number;
}

export interface PlatformState {
  mode: 'SEED';
  activeCycleId: string;
  requestedRegime: Regime;
  cycles: FundCycle[];
  sleevesByCycle: Record<string, SleeveRecord[]>;
  investors: InvestorRecord[];
  contributions: InvestorContributionRecord[];
  repayments: InvestorRepaymentRecord[];
  marketHoldings: MarketHoldingRecord[];
  borrowers: BorrowerRecord[];
  loans: LoanRecord[];
  loanSchedules: LoanScheduleRecord[];
  loanRepayments: LoanRepaymentRecord[];
  engineRecords: EngineCycleRecord[];
  auditEntries: AuditEntry[];
  icDecisions: ICDecision[];
  ledgerEntries: LedgerEntry[];
  waterfallRuns: WaterfallRunRecord[];
  opportunisticTriggers: OpportunisticTriggerRecord[];
  reportSnapshots: ReportSnapshotRecord[];
}

export type { CycleStatus, FundCycle, InvestorContributionRecord, InvestorRecord, InvestorRepaymentRecord };
