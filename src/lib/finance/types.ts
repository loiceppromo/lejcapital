import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

// ─── Money helpers ───

export function ghs(pesewas: number | string | Decimal): Decimal {
  return new Decimal(pesewas);
}

export function formatGHS(amount: Decimal): string {
  return `GHS ${amount.toFixed(2)}`;
}

export function toDisplayGHS(amount: Decimal): string {
  const num = amount.toNumber();
  return `GHS ${num.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

// ─── TBC sentinel ───

export const TBC = Symbol('TBC');
export type MaybeTBC<T> = T | typeof TBC;

export function isTBC<T>(value: MaybeTBC<T>): value is typeof TBC {
  return value === TBC;
}

export function requireValue<T>(value: MaybeTBC<T>, fieldName: string): T {
  if (isTBC(value)) {
    throw new InsufficientDataError(fieldName);
  }
  return value;
}

export class InsufficientDataError extends Error {
  public readonly field: string;
  constructor(field: string) {
    super(`Insufficient data: ${field} is TBC`);
    this.name = 'InsufficientDataError';
    this.field = field;
  }
}

// ─── Domain types ───

export type Regime = 'DEFENSIVE' | 'NORMAL' | 'OPPORTUNISTIC';
export type ReturnScenario = 'BEAR' | 'BASE' | 'BULL';
export type InstrumentType = 'GSE_EQUITY' | 'TBILL' | 'CASH';
export type InterestMethod = 'FLAT' | 'REDUCING_BALANCE';
export type RepaymentAllocOrder =
  | 'FEES_INTEREST_PRINCIPAL'
  | 'FEES_PRINCIPAL_INTEREST'
  | 'PRINCIPAL_INTEREST_FEES';

export interface RegimeSplit {
  gsePct: Decimal;
  tbillPct: Decimal;
  cashPct: Decimal;
}

export interface ReturnAssumptions {
  GSE_EQUITY: Record<ReturnScenario, Decimal>;
  TBILL: Record<ReturnScenario, Decimal>;
  CASH: Record<ReturnScenario, Decimal>;
}

export interface BrandScoreInputs {
  roic: MaybeTBC<Decimal>;
  cashConversion: MaybeTBC<Decimal>;
  sellThrough: MaybeTBC<Decimal>;
  repeatDemand: MaybeTBC<Decimal>;
  operationalRisk: MaybeTBC<Decimal>;
}

export interface EngineAllocationInput {
  engineCode: string;
  brandScore: Decimal | null;
  validationGate: boolean;
}

export interface ScheduleItem {
  period: number;
  dueDate: Date;
  principalDue: Decimal;
  interestDue: Decimal;
  totalDue: Decimal;
  outstandingAfter: Decimal;
}

export interface WaterfallClaim {
  priority: number;
  claimType: string;
  amountClaimed: Decimal;
}

export interface WaterfallResult {
  priority: number;
  claimType: string;
  amountClaimed: Decimal;
  amountPaid: Decimal;
  fullyPaid: boolean;
  cashAfter: Decimal;
}

export interface LoanAgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  provisionRate: Decimal;
}

export interface LoanPortfolioMetrics {
  totalOutstanding: Decimal;
  weightedAvgInterestRate: Decimal;
  parOver30: Decimal;
  parOver90: Decimal;
  defaultRate: Decimal;
  totalInterestEarned: Decimal;
  totalProvisions: Decimal;
  netLoanBookValue: Decimal;
}

export interface PCRResult {
  pcr: Decimal;
  liquidAssets: Decimal;
  principalDue: Decimal;
  status: 'GREEN' | 'WATCH' | 'CAUTION' | 'PROTECTION_MODE';
}

export interface StressScenarioResult {
  label: string;
  pcr: Decimal;
  principalCovered: boolean;
  navImpact: Decimal;
}
