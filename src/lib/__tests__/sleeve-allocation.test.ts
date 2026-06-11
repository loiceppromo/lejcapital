/**
 * Tests for sleeve allocation logic and the retained capital rule.
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '@/lib/finance';
import { allocateSleeves, validateRetainedCapitalRule, type SleeveAllocationInput } from '@/lib/finance/sleeves';

function makeInput(overrides: Partial<SleeveAllocationInput> = {}): SleeveAllocationInput {
  return {
    totalCapital: new Decimal('200000'),
    retainedCapital: new Decimal('50000'),
    newContributions: new Decimal('150000'),
    investorPrincipalDue: new Decimal('100000'),
    pcrTargetHigh: new Decimal('1.25'),
    reserveFloorAmount: new Decimal('10000'),
    ...overrides,
  };
}

describe('allocateSleeves', () => {
  it('allocates protection first to achieve PCR target', () => {
    const result = allocateSleeves(makeInput());
    // Protection = 100000 * 1.25 = 125000
    expect(result.protection.toNumber()).toBe(125000);
    expect(result.warnings).toEqual([]);
  });

  it('allocates reserve after protection', () => {
    const result = allocateSleeves(makeInput());
    // After protection (125000), remaining = 75000
    // Reserve = min(10000, 75000) = 10000
    expect(result.reserve.toNumber()).toBe(10000);
  });

  it('allocates operating alpha from new contributions only', () => {
    const result = allocateSleeves(makeInput());
    // After protection (125000) + reserve (10000), remaining = 65000
    // OA = min(newContributions=150000, remaining=65000) = 65000
    expect(result.operatingAlpha.toNumber()).toBe(65000);
  });

  it('allocates market alpha from the remainder', () => {
    const result = allocateSleeves(makeInput());
    // After protection + reserve + OA = 125000 + 10000 + 65000 = 200000
    // Market alpha = 200000 - 200000 = 0
    expect(result.marketAlpha.toNumber()).toBe(0);
  });

  it('loan book always starts at zero', () => {
    const result = allocateSleeves(makeInput());
    expect(result.loanBook.toNumber()).toBe(0);
  });

  it('warns when protection is underfunded', () => {
    const result = allocateSleeves(makeInput({
      totalCapital: new Decimal('50000'),
      investorPrincipalDue: new Decimal('100000'),
    }));
    expect(result.protection.toNumber()).toBe(50000); // all capital goes to protection
    expect(result.warnings.some((w) => w.includes('Protection underfunded'))).toBe(true);
  });

  it('warns when reserve is underfunded', () => {
    const result = allocateSleeves(makeInput({
      totalCapital: new Decimal('130000'),
      reserveFloorAmount: new Decimal('20000'),
    }));
    // Protection takes 125000, remaining = 5000 for 20000 reserve
    expect(result.reserve.toNumber()).toBe(5000);
    expect(result.warnings.some((w) => w.includes('Reserve underfunded'))).toBe(true);
  });

  it('handles zero total capital gracefully', () => {
    const result = allocateSleeves(makeInput({ totalCapital: new Decimal(0) }));
    expect(result.protection.toNumber()).toBe(0);
    expect(result.reserve.toNumber()).toBe(0);
    expect(result.operatingAlpha.toNumber()).toBe(0);
    expect(result.marketAlpha.toNumber()).toBe(0);
  });

  it('surplus capital flows to market alpha', () => {
    const result = allocateSleeves(makeInput({
      totalCapital: new Decimal('500000'),
      investorPrincipalDue: new Decimal('50000'),
      newContributions: new Decimal('100000'),
      reserveFloorAmount: new Decimal('10000'),
    }));
    // Protection = 50000 * 1.25 = 62500
    // Reserve = 10000
    // OA = min(100000, 500000 - 62500 - 10000) = 100000
    // Market = 500000 - 62500 - 10000 - 100000 = 327500
    expect(result.protection.toNumber()).toBe(62500);
    expect(result.reserve.toNumber()).toBe(10000);
    expect(result.operatingAlpha.toNumber()).toBe(100000);
    expect(result.marketAlpha.toNumber()).toBe(327500);
    expect(result.warnings).toEqual([]);
  });
});

describe('validateRetainedCapitalRule', () => {
  it('returns true when OA equals new contributions', () => {
    expect(validateRetainedCapitalRule(new Decimal('100000'), new Decimal('100000'))).toBe(true);
  });

  it('returns true when OA is below new contributions', () => {
    expect(validateRetainedCapitalRule(new Decimal('50000'), new Decimal('100000'))).toBe(true);
  });

  it('returns false when OA exceeds new contributions', () => {
    expect(validateRetainedCapitalRule(new Decimal('150000'), new Decimal('100000'))).toBe(false);
  });

  it('returns true when both are zero', () => {
    expect(validateRetainedCapitalRule(new Decimal(0), new Decimal(0))).toBe(true);
  });
});
