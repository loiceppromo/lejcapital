import { describe, it, expect } from 'vitest';
import { computePCR, getPCRActions, type PCRInputs } from '../pcr';
import { Decimal } from '../types';

function d(v: string | number) {
  return new Decimal(v);
}

describe('computePCR', () => {
  it('computes PCR from liquid assets and principal due', () => {
    const inputs: PCRInputs = {
      protectionSleeve: d(50000),
      reserveLiquid: d(10000),
      tbillsMaturingBeforeRepayment: d(30000),
      prepaidRevenueCollected: d(10000),
      investorPrincipalDue: d(80000),
    };
    const result = computePCR(inputs);
    // (50000+10000+30000+10000)/80000 = 100000/80000 = 1.25
    expect(result.pcr.toFixed(6)).toBe('1.250000');
    expect(result.liquidAssets.toFixed(2)).toBe('100000.00');
    expect(result.status).toBe('GREEN');
  });

  it('returns GREEN when PCR >= 1.15', () => {
    const result = computePCR({
      protectionSleeve: d(60000),
      reserveLiquid: d(5000),
      tbillsMaturingBeforeRepayment: d(50000),
      prepaidRevenueCollected: d(5000),
      investorPrincipalDue: d(100000),
    });
    // 120000/100000 = 1.20
    expect(result.pcr.toFixed(2)).toBe('1.20');
    expect(result.status).toBe('GREEN');
  });

  it('returns WATCH when PCR between 1.05 and 1.15', () => {
    const result = computePCR({
      protectionSleeve: d(40000),
      reserveLiquid: d(5000),
      tbillsMaturingBeforeRepayment: d(20000),
      prepaidRevenueCollected: d(5000),
      investorPrincipalDue: d(65000),
    });
    // 70000/65000 ≈ 1.0769
    expect(result.pcr.toNumber()).toBeGreaterThanOrEqual(1.05);
    expect(result.pcr.toNumber()).toBeLessThan(1.15);
    expect(result.status).toBe('WATCH');
  });

  it('returns CAUTION when PCR between 1.00 and 1.05', () => {
    const result = computePCR({
      protectionSleeve: d(40000),
      reserveLiquid: d(3000),
      tbillsMaturingBeforeRepayment: d(15000),
      prepaidRevenueCollected: d(2500),
      investorPrincipalDue: d(60000),
    });
    // 60500/60000 ≈ 1.00833
    expect(result.pcr.toNumber()).toBeGreaterThanOrEqual(1.00);
    expect(result.pcr.toNumber()).toBeLessThan(1.05);
    expect(result.status).toBe('CAUTION');
  });

  it('returns PROTECTION_MODE when PCR < 1.00', () => {
    const result = computePCR({
      protectionSleeve: d(30000),
      reserveLiquid: d(5000),
      tbillsMaturingBeforeRepayment: d(10000),
      prepaidRevenueCollected: d(2000),
      investorPrincipalDue: d(60000),
    });
    // 47000/60000 ≈ 0.783
    expect(result.pcr.toNumber()).toBeLessThan(1.00);
    expect(result.status).toBe('PROTECTION_MODE');
  });

  it('handles zero principal due gracefully', () => {
    const result = computePCR({
      protectionSleeve: d(10000),
      reserveLiquid: d(5000),
      tbillsMaturingBeforeRepayment: d(0),
      prepaidRevenueCollected: d(0),
      investorPrincipalDue: d(0),
    });
    expect(result.pcr.toNumber()).toBeGreaterThan(100);
    expect(result.status).toBe('GREEN');
  });

  it('excludes GSE equities and outstanding loan principal (by design: not in inputs)', () => {
    // PCR inputs only accept liquid components.
    // This test verifies the type contract: no GSE or loan fields exist.
    const inputs: PCRInputs = {
      protectionSleeve: d(50000),
      reserveLiquid: d(10000),
      tbillsMaturingBeforeRepayment: d(20000),
      prepaidRevenueCollected: d(5000),
      investorPrincipalDue: d(70000),
    };
    const result = computePCR(inputs);
    expect(result.liquidAssets.toFixed(2)).toBe('85000.00');
  });
});

describe('getPCRActions', () => {
  it('returns null for GREEN', () => {
    expect(getPCRActions('GREEN')).toBeNull();
  });

  it('returns actions for WATCH', () => {
    const actions = getPCRActions('WATCH');
    expect(actions).not.toBeNull();
    expect(actions!.actions).toContain('Suspend GSE buying');
  });

  it('returns actions for CAUTION', () => {
    const actions = getPCRActions('CAUTION');
    expect(actions!.actions).toContain('Route proceeds to Protection sleeve');
  });

  it('returns actions for PROTECTION_MODE', () => {
    const actions = getPCRActions('PROTECTION_MODE');
    expect(actions!.actions).toContain('Halt all new operating/market/loan deployment');
  });
});
