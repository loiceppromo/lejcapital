import { Decimal, ZERO, type LoanAgingBucket } from './types';

// BoG-aligned provisioning bands
export const AGING_BUCKETS: LoanAgingBucket[] = [
  { label: 'Current',      minDays: 0,   maxDays: 0,    provisionRate: new Decimal('0.01') },
  { label: '1–30 days',    minDays: 1,   maxDays: 30,   provisionRate: new Decimal('0.01') },
  { label: '31–60 days',   minDays: 31,  maxDays: 60,   provisionRate: new Decimal('0.10') },
  { label: '61–90 days',   minDays: 61,  maxDays: 90,   provisionRate: new Decimal('0.10') },
  { label: '91–180 days (Substandard)', minDays: 91,  maxDays: 180, provisionRate: new Decimal('0.25') },
  { label: '181–360 days (Doubtful)',   minDays: 181, maxDays: 360, provisionRate: new Decimal('0.50') },
  { label: '360+ days (Loss)',          minDays: 361, maxDays: null, provisionRate: new Decimal('1.00') },
];

export function getAgingBucket(daysPastDue: number): LoanAgingBucket {
  for (const bucket of AGING_BUCKETS) {
    if (bucket.maxDays === null) {
      if (daysPastDue >= bucket.minDays) return bucket;
    } else {
      if (daysPastDue >= bucket.minDays && daysPastDue <= bucket.maxDays) return bucket;
    }
  }
  return AGING_BUCKETS[0];
}

export function computeProvision(
  outstandingPrincipal: Decimal,
  daysPastDue: number,
): Decimal {
  const bucket = getAgingBucket(daysPastDue);
  return outstandingPrincipal.times(bucket.provisionRate);
}

export interface LoanForPAR {
  outstandingPrincipal: Decimal;
  maxDaysPastDue: number;
  status: string;
}

export function computePAR(loans: LoanForPAR[], thresholdDays: number): Decimal {
  const activeLoans = loans.filter(
    (l) => l.status === 'ACTIVE' || l.status === 'DEFAULTED',
  );

  const totalOutstanding = activeLoans.reduce(
    (sum, l) => sum.plus(l.outstandingPrincipal),
    ZERO,
  );

  if (totalOutstanding.isZero()) return ZERO;

  const atRisk = activeLoans
    .filter((l) => l.maxDaysPastDue > thresholdDays)
    .reduce((sum, l) => sum.plus(l.outstandingPrincipal), ZERO);

  return atRisk.div(totalOutstanding);
}

export function computeDefaultRate(loans: LoanForPAR[]): Decimal {
  if (loans.length === 0) return ZERO;

  const totalOutstanding = loans.reduce(
    (sum, l) => sum.plus(l.outstandingPrincipal),
    ZERO,
  );

  if (totalOutstanding.isZero()) return ZERO;

  const defaulted = loans
    .filter((l) => l.status === 'DEFAULTED' || l.status === 'WRITTEN_OFF')
    .reduce((sum, l) => sum.plus(l.outstandingPrincipal), ZERO);

  return defaulted.div(totalOutstanding);
}

export function computeWeightedAvgRate(
  loans: { outstandingPrincipal: Decimal; interestRate: Decimal }[],
): Decimal {
  const totalOutstanding = loans.reduce(
    (sum, l) => sum.plus(l.outstandingPrincipal),
    ZERO,
  );

  if (totalOutstanding.isZero()) return ZERO;

  const weightedSum = loans.reduce(
    (sum, l) => sum.plus(l.outstandingPrincipal.times(l.interestRate)),
    ZERO,
  );

  return weightedSum.div(totalOutstanding);
}

export function computeNetLoanBookValue(
  loans: { outstandingPrincipal: Decimal; provisionAmount: Decimal }[],
): Decimal {
  return loans.reduce(
    (sum, l) => sum.plus(l.outstandingPrincipal.minus(l.provisionAmount)),
    ZERO,
  );
}

export interface RepaymentAllocation {
  allocatedToFees: Decimal;
  allocatedToInterest: Decimal;
  allocatedToPrincipal: Decimal;
  remainder: Decimal;
}

export function allocateRepayment(
  amount: Decimal,
  feesDue: Decimal,
  interestDue: Decimal,
  principalDue: Decimal,
  order: 'FEES_INTEREST_PRINCIPAL' | 'FEES_PRINCIPAL_INTEREST' | 'PRINCIPAL_INTEREST_FEES',
): RepaymentAllocation {
  let remaining = amount;
  let allocatedToFees = ZERO;
  let allocatedToInterest = ZERO;
  let allocatedToPrincipal = ZERO;

  const allocateTo = (due: Decimal): Decimal => {
    const alloc = Decimal.min(remaining, due);
    remaining = remaining.minus(alloc);
    return alloc;
  };

  const steps = order.split('_') as ('FEES' | 'INTEREST' | 'PRINCIPAL')[];

  for (const step of steps) {
    switch (step) {
      case 'FEES':
        allocatedToFees = allocateTo(feesDue);
        break;
      case 'INTEREST':
        allocatedToInterest = allocateTo(interestDue);
        break;
      case 'PRINCIPAL':
        allocatedToPrincipal = allocateTo(principalDue);
        break;
    }
  }

  return {
    allocatedToFees,
    allocatedToInterest,
    allocatedToPrincipal,
    remainder: remaining,
  };
}
