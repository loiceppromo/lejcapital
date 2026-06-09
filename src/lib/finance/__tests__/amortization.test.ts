import { describe, it, expect } from 'vitest';
import { generateSchedule, computeOutstandingBalance, computeNetDisbursement } from '../amortization';
import { Decimal, ZERO } from '../types';

function d(v: string | number) {
  return new Decimal(v);
}

describe('generateSchedule — Flat interest', () => {
  it('generates correct flat interest schedule', () => {
    const schedule = generateSchedule({
      principal: d(12000),
      annualRate: d('0.24'), // 24% annual
      termMonths: 12,
      method: 'FLAT',
      disbursementDate: new Date('2025-01-01'),
    });

    expect(schedule).toHaveLength(12);

    // Total interest = 12000 * 0.24 * (12/12) = 2880
    // Monthly interest = 2880/12 = 240
    // Monthly principal = 12000/12 = 1000
    expect(schedule[0].interestDue.toFixed(2)).toBe('240.00');
    expect(schedule[0].principalDue.toFixed(2)).toBe('1000.00');
    expect(schedule[0].totalDue.toFixed(2)).toBe('1240.00');

    // Outstanding after first payment = 11000
    expect(schedule[0].outstandingAfter.toFixed(2)).toBe('11000.00');

    // Last payment zeroes out
    expect(schedule[11].outstandingAfter.toFixed(2)).toBe('0.00');

    // Total principal paid equals original principal
    const totalPrincipal = schedule.reduce(
      (sum, item) => sum.plus(item.principalDue),
      ZERO,
    );
    expect(totalPrincipal.toFixed(2)).toBe('12000.00');

    // Total interest = 2880
    const totalInterest = schedule.reduce(
      (sum, item) => sum.plus(item.interestDue),
      ZERO,
    );
    expect(totalInterest.toFixed(2)).toBe('2880.00');
  });

  it('handles short-term flat loan', () => {
    const schedule = generateSchedule({
      principal: d(5000),
      annualRate: d('0.30'),
      termMonths: 3,
      method: 'FLAT',
      disbursementDate: new Date('2025-06-01'),
    });

    expect(schedule).toHaveLength(3);
    // Total interest = 5000 * 0.30 * (3/12) = 375
    const totalInterest = schedule.reduce((s, i) => s.plus(i.interestDue), ZERO);
    expect(totalInterest.toFixed(2)).toBe('375.00');
    expect(schedule[2].outstandingAfter.toFixed(2)).toBe('0.00');
  });
});

describe('generateSchedule — Reducing balance', () => {
  it('generates correct reducing balance schedule', () => {
    const schedule = generateSchedule({
      principal: d(12000),
      annualRate: d('0.24'), // 24% annual → 2% monthly
      termMonths: 12,
      method: 'REDUCING_BALANCE',
      disbursementDate: new Date('2025-01-01'),
    });

    expect(schedule).toHaveLength(12);

    // PMT = 12000 * 0.02 / (1 - (1.02)^-12) ≈ 1134.72
    // First month interest = 12000 * 0.02 = 240
    expect(schedule[0].interestDue.toFixed(2)).toBe('240.00');

    // First month total payment
    const firstTotal = schedule[0].totalDue;
    expect(firstTotal.toNumber()).toBeCloseTo(1134.72, 0);

    // Interest decreases over time
    expect(schedule[11].interestDue.toNumber()).toBeLessThan(
      schedule[0].interestDue.toNumber(),
    );

    // Principal increases over time
    expect(schedule[11].principalDue.toNumber()).toBeGreaterThan(
      schedule[0].principalDue.toNumber(),
    );

    // Final outstanding is zero
    expect(schedule[11].outstandingAfter.toFixed(2)).toBe('0.00');

    // Total principal paid equals original
    const totalPrincipal = schedule.reduce(
      (sum, item) => sum.plus(item.principalDue),
      ZERO,
    );
    expect(totalPrincipal.toFixed(2)).toBe('12000.00');
  });

  it('total interest is less for reducing balance than flat', () => {
    const flat = generateSchedule({
      principal: d(12000),
      annualRate: d('0.24'),
      termMonths: 12,
      method: 'FLAT',
      disbursementDate: new Date('2025-01-01'),
    });
    const reducing = generateSchedule({
      principal: d(12000),
      annualRate: d('0.24'),
      termMonths: 12,
      method: 'REDUCING_BALANCE',
      disbursementDate: new Date('2025-01-01'),
    });

    const flatInterest = flat.reduce((s, i) => s.plus(i.interestDue), ZERO);
    const reducingInterest = reducing.reduce((s, i) => s.plus(i.interestDue), ZERO);

    expect(reducingInterest.toNumber()).toBeLessThan(flatInterest.toNumber());
  });

  it('handles zero interest rate', () => {
    const schedule = generateSchedule({
      principal: d(6000),
      annualRate: d('0'),
      termMonths: 6,
      method: 'REDUCING_BALANCE',
      disbursementDate: new Date('2025-01-01'),
    });

    expect(schedule).toHaveLength(6);
    expect(schedule[0].interestDue.toFixed(2)).toBe('0.00');
    expect(schedule[0].principalDue.toFixed(2)).toBe('1000.00');
    expect(schedule[5].outstandingAfter.toFixed(2)).toBe('0.00');
  });
});

describe('computeOutstandingBalance', () => {
  it('subtracts paid from principal', () => {
    expect(computeOutstandingBalance(d(10000), d(3000)).toFixed(2)).toBe('7000.00');
  });

  it('returns zero if overpaid', () => {
    expect(computeOutstandingBalance(d(5000), d(6000)).toFixed(2)).toBe('0.00');
  });
});

describe('computeNetDisbursement', () => {
  it('deducts origination fee when deduct mode', () => {
    expect(computeNetDisbursement(d(10000), d(200), true).toFixed(2)).toBe('9800.00');
  });

  it('returns full principal when add-to-balance mode', () => {
    expect(computeNetDisbursement(d(10000), d(200), false).toFixed(2)).toBe('10000.00');
  });
});
