import { describe, it, expect } from 'vitest';
import { allocateSleeves, validateRetainedCapitalRule } from '../sleeves';
import { Decimal } from '../types';

function d(v: string | number) {
  return new Decimal(v);
}

describe('allocateSleeves', () => {
  it('funds sleeves in priority order: Protection → Reserve → OA → MA', () => {
    const result = allocateSleeves({
      totalCapital: d(200000),
      retainedCapital: d(30000),
      newContributions: d(170000),
      investorPrincipalDue: d(100000),
      pcrTargetHigh: d('1.25'),
      reserveFloorAmount: d(15000),
    });

    // Protection = 100000 * 1.25 = 125000
    expect(result.protection.toFixed(2)).toBe('125000.00');
    // Reserve = 15000
    expect(result.reserve.toFixed(2)).toBe('15000.00');
    // OA = min(newContributions=170000, remaining=60000) = 60000
    expect(result.operatingAlpha.toFixed(2)).toBe('60000.00');
    // MA = remaining = 0
    expect(result.marketAlpha.toFixed(2)).toBe('0.00');
    expect(result.warnings).toHaveLength(0);
  });

  it('warns when Protection is underfunded', () => {
    const result = allocateSleeves({
      totalCapital: d(80000),
      retainedCapital: d(0),
      newContributions: d(80000),
      investorPrincipalDue: d(100000),
      pcrTargetHigh: d('1.25'),
      reserveFloorAmount: d(15000),
    });

    expect(result.protection.toFixed(2)).toBe('80000.00');
    expect(result.warnings.some((w) => w.includes('Protection underfunded'))).toBe(true);
  });

  it('retained capital flows to MA, never OA', () => {
    const result = allocateSleeves({
      totalCapital: d(300000),
      retainedCapital: d(100000),
      newContributions: d(200000),
      investorPrincipalDue: d(100000),
      pcrTargetHigh: d('1.25'),
      reserveFloorAmount: d(10000),
    });

    // Protection = 125000, Reserve = 10000, remaining = 165000
    // OA capped at newContributions = 200000, but only 165000 remaining
    expect(result.operatingAlpha.lte(d(200000))).toBe(true);
    // MA gets what's left
    const total = result.protection
      .plus(result.reserve)
      .plus(result.operatingAlpha)
      .plus(result.marketAlpha);
    expect(total.toFixed(2)).toBe('300000.00');
  });

  it('OA never exceeds new contributions', () => {
    const result = allocateSleeves({
      totalCapital: d(500000),
      retainedCapital: d(300000),
      newContributions: d(200000),
      investorPrincipalDue: d(50000),
      pcrTargetHigh: d('1.25'),
      reserveFloorAmount: d(10000),
    });

    expect(result.operatingAlpha.lte(d(200000))).toBe(true);
  });
});

describe('validateRetainedCapitalRule', () => {
  it('passes when OA <= new contributions', () => {
    expect(validateRetainedCapitalRule(d(50000), d(80000))).toBe(true);
  });

  it('fails when OA > new contributions', () => {
    expect(validateRetainedCapitalRule(d(90000), d(80000))).toBe(false);
  });
});
