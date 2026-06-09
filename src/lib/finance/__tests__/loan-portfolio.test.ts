import { describe, it, expect } from 'vitest';
import {
  getAgingBucket,
  computeProvision,
  computePAR,
  computeDefaultRate,
  computeWeightedAvgRate,
  computeNetLoanBookValue,
  allocateRepayment,
  AGING_BUCKETS,
} from '../loan-portfolio';
import { Decimal } from '../types';

function d(v: string | number) {
  return new Decimal(v);
}

describe('aging buckets (BoG-aligned)', () => {
  it('has 7 bands', () => {
    expect(AGING_BUCKETS).toHaveLength(7);
  });

  it('maps 0 days to Current (1%)', () => {
    const bucket = getAgingBucket(0);
    expect(bucket.label).toBe('Current');
    expect(bucket.provisionRate.toFixed(2)).toBe('0.01');
  });

  it('maps 15 days to 1-30 (1%)', () => {
    const bucket = getAgingBucket(15);
    expect(bucket.provisionRate.toFixed(2)).toBe('0.01');
  });

  it('maps 45 days to 31-60 (10% OLEM)', () => {
    const bucket = getAgingBucket(45);
    expect(bucket.provisionRate.toFixed(2)).toBe('0.10');
  });

  it('maps 75 days to 61-90 (10% OLEM)', () => {
    const bucket = getAgingBucket(75);
    expect(bucket.provisionRate.toFixed(2)).toBe('0.10');
  });

  it('maps 120 days to 91-180 Substandard (25%)', () => {
    const bucket = getAgingBucket(120);
    expect(bucket.label).toContain('Substandard');
    expect(bucket.provisionRate.toFixed(2)).toBe('0.25');
  });

  it('maps 200 days to 181-360 Doubtful (50%)', () => {
    const bucket = getAgingBucket(200);
    expect(bucket.label).toContain('Doubtful');
    expect(bucket.provisionRate.toFixed(2)).toBe('0.50');
  });

  it('maps 400 days to 360+ Loss (100%)', () => {
    const bucket = getAgingBucket(400);
    expect(bucket.label).toContain('Loss');
    expect(bucket.provisionRate.toFixed(2)).toBe('1.00');
  });
});

describe('computeProvision', () => {
  it('provisions 1% for current loans', () => {
    expect(computeProvision(d(10000), 0).toFixed(2)).toBe('100.00');
  });

  it('provisions 25% for 120-day overdue', () => {
    expect(computeProvision(d(10000), 120).toFixed(2)).toBe('2500.00');
  });

  it('provisions 100% for 400-day overdue', () => {
    expect(computeProvision(d(10000), 400).toFixed(2)).toBe('10000.00');
  });
});

describe('computePAR', () => {
  it('computes PAR>30', () => {
    const loans = [
      { outstandingPrincipal: d(50000), maxDaysPastDue: 0, status: 'ACTIVE' },
      { outstandingPrincipal: d(20000), maxDaysPastDue: 45, status: 'ACTIVE' },
      { outstandingPrincipal: d(30000), maxDaysPastDue: 10, status: 'ACTIVE' },
    ];
    const par30 = computePAR(loans, 30);
    // Only the 45-day loan: 20000/100000 = 0.20
    expect(par30.toFixed(2)).toBe('0.20');
  });

  it('computes PAR>90', () => {
    const loans = [
      { outstandingPrincipal: d(50000), maxDaysPastDue: 0, status: 'ACTIVE' },
      { outstandingPrincipal: d(20000), maxDaysPastDue: 95, status: 'DEFAULTED' },
      { outstandingPrincipal: d(30000), maxDaysPastDue: 10, status: 'ACTIVE' },
    ];
    const par90 = computePAR(loans, 90);
    // 20000/100000 = 0.20
    expect(par90.toFixed(2)).toBe('0.20');
  });

  it('returns zero for no loans', () => {
    expect(computePAR([], 30).toFixed(2)).toBe('0.00');
  });

  it('excludes PAID_OFF and WRITTEN_OFF loans', () => {
    const loans = [
      { outstandingPrincipal: d(50000), maxDaysPastDue: 95, status: 'PAID_OFF' },
      { outstandingPrincipal: d(20000), maxDaysPastDue: 0, status: 'ACTIVE' },
    ];
    const par90 = computePAR(loans, 90);
    // Paid-off excluded; active 20000 has 0 days → 0/20000
    expect(par90.toFixed(2)).toBe('0.00');
  });
});

describe('computeDefaultRate', () => {
  it('computes default rate', () => {
    const loans = [
      { outstandingPrincipal: d(50000), maxDaysPastDue: 0, status: 'ACTIVE' },
      { outstandingPrincipal: d(10000), maxDaysPastDue: 100, status: 'DEFAULTED' },
      { outstandingPrincipal: d(40000), maxDaysPastDue: 0, status: 'ACTIVE' },
    ];
    const rate = computeDefaultRate(loans);
    // 10000/100000 = 0.10
    expect(rate.toFixed(2)).toBe('0.10');
  });
});

describe('computeWeightedAvgRate', () => {
  it('computes weighted average interest rate', () => {
    const loans = [
      { outstandingPrincipal: d(60000), interestRate: d('0.24') },
      { outstandingPrincipal: d(40000), interestRate: d('0.30') },
    ];
    const wavg = computeWeightedAvgRate(loans);
    // (60000*0.24 + 40000*0.30) / 100000 = (14400+12000)/100000 = 0.264
    expect(wavg.toFixed(3)).toBe('0.264');
  });
});

describe('computeNetLoanBookValue', () => {
  it('subtracts provisions from outstanding', () => {
    const loans = [
      { outstandingPrincipal: d(50000), provisionAmount: d(500) },
      { outstandingPrincipal: d(30000), provisionAmount: d(7500) },
    ];
    const net = computeNetLoanBookValue(loans);
    // (50000-500) + (30000-7500) = 49500 + 22500 = 72000
    expect(net.toFixed(2)).toBe('72000.00');
  });
});

describe('allocateRepayment', () => {
  it('allocates fees → interest → principal by default', () => {
    const result = allocateRepayment(
      d(1500),
      d(100), // fees
      d(500), // interest
      d(1000), // principal
      'FEES_INTEREST_PRINCIPAL',
    );
    expect(result.allocatedToFees.toFixed(2)).toBe('100.00');
    expect(result.allocatedToInterest.toFixed(2)).toBe('500.00');
    expect(result.allocatedToPrincipal.toFixed(2)).toBe('900.00');
    expect(result.remainder.toFixed(2)).toBe('0.00');
  });

  it('handles partial payment', () => {
    const result = allocateRepayment(
      d(400),
      d(100),
      d(500),
      d(1000),
      'FEES_INTEREST_PRINCIPAL',
    );
    expect(result.allocatedToFees.toFixed(2)).toBe('100.00');
    expect(result.allocatedToInterest.toFixed(2)).toBe('300.00');
    expect(result.allocatedToPrincipal.toFixed(2)).toBe('0.00');
    expect(result.remainder.toFixed(2)).toBe('0.00');
  });

  it('supports principal-first ordering', () => {
    const result = allocateRepayment(
      d(1500),
      d(100),
      d(500),
      d(1000),
      'PRINCIPAL_INTEREST_FEES',
    );
    // Order: principal(1000) → interest(500) → fees: only 0 left
    expect(result.allocatedToPrincipal.toFixed(2)).toBe('1000.00');
    expect(result.allocatedToInterest.toFixed(2)).toBe('500.00');
    expect(result.allocatedToFees.toFixed(2)).toBe('0.00');
    expect(result.remainder.toFixed(2)).toBe('0.00');
  });

  it('returns remainder if overpayment', () => {
    const result = allocateRepayment(
      d(2000),
      d(100),
      d(500),
      d(1000),
      'FEES_INTEREST_PRINCIPAL',
    );
    expect(result.remainder.toFixed(2)).toBe('400.00');
  });
});
