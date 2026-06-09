import { describe, it, expect } from 'vitest';
import { runWaterfall } from '../waterfall';
import { Decimal, type WaterfallClaim } from '../types';

function d(v: string | number) {
  return new Decimal(v);
}

describe('runWaterfall', () => {
  it('pays claims strictly in priority order', () => {
    const claims: WaterfallClaim[] = [
      { priority: 1, claimType: 'INVESTOR_PRINCIPAL', amountClaimed: d(50000) },
      { priority: 2, claimType: 'SUPPLIER_LIABILITIES', amountClaimed: d(10000) },
      { priority: 3, claimType: 'TAXES', amountClaimed: d(5000) },
      { priority: 4, claimType: 'CUSTOMER_REFUNDS', amountClaimed: d(3000) },
      { priority: 5, claimType: 'EMERGENCY_PRODUCTION', amountClaimed: d(2000) },
    ];
    const results = runWaterfall(d(80000), claims);

    expect(results).toHaveLength(5);
    expect(results[0].amountPaid.toFixed(2)).toBe('50000.00');
    expect(results[0].fullyPaid).toBe(true);
    expect(results[0].cashAfter.toFixed(2)).toBe('30000.00');

    expect(results[1].amountPaid.toFixed(2)).toBe('10000.00');
    expect(results[1].fullyPaid).toBe(true);

    expect(results[4].amountPaid.toFixed(2)).toBe('2000.00');
    expect(results[4].fullyPaid).toBe(true);
    expect(results[4].cashAfter.toFixed(2)).toBe('10000.00');
  });

  it('stops funding lower priorities when cash runs out', () => {
    const claims: WaterfallClaim[] = [
      { priority: 1, claimType: 'INVESTOR_PRINCIPAL', amountClaimed: d(50000) },
      { priority: 2, claimType: 'SUPPLIER_LIABILITIES', amountClaimed: d(10000) },
      { priority: 3, claimType: 'TAXES', amountClaimed: d(5000) },
    ];
    const results = runWaterfall(d(55000), claims);

    expect(results[0].fullyPaid).toBe(true);
    expect(results[0].amountPaid.toFixed(2)).toBe('50000.00');

    // 55000 - 50000 = 5000 left; supplier wants 10000, gets 5000 (partial)
    expect(results[1].amountPaid.toFixed(2)).toBe('5000.00');
    expect(results[1].fullyPaid).toBe(false);

    expect(results[2].amountPaid.toFixed(2)).toBe('0.00');
    expect(results[2].fullyPaid).toBe(false);
    expect(results[2].cashAfter.toFixed(2)).toBe('0.00');
  });

  it('handles exact cash match', () => {
    const claims: WaterfallClaim[] = [
      { priority: 1, claimType: 'INVESTOR_PRINCIPAL', amountClaimed: d(30000) },
      { priority: 2, claimType: 'TAXES', amountClaimed: d(20000) },
    ];
    const results = runWaterfall(d(50000), claims);

    expect(results[0].fullyPaid).toBe(true);
    expect(results[1].fullyPaid).toBe(true);
    expect(results[1].cashAfter.toFixed(2)).toBe('0.00');
  });

  it('handles zero cash', () => {
    const claims: WaterfallClaim[] = [
      { priority: 1, claimType: 'INVESTOR_PRINCIPAL', amountClaimed: d(50000) },
    ];
    const results = runWaterfall(d(0), claims);
    expect(results[0].amountPaid.toFixed(2)).toBe('0.00');
    expect(results[0].fullyPaid).toBe(false);
  });

  it('sorts by priority even if claims are unordered', () => {
    const claims: WaterfallClaim[] = [
      { priority: 3, claimType: 'TAXES', amountClaimed: d(5000) },
      { priority: 1, claimType: 'INVESTOR_PRINCIPAL', amountClaimed: d(50000) },
      { priority: 2, claimType: 'SUPPLIER_LIABILITIES', amountClaimed: d(10000) },
    ];
    const results = runWaterfall(d(60000), claims);
    expect(results[0].claimType).toBe('INVESTOR_PRINCIPAL');
    expect(results[1].claimType).toBe('SUPPLIER_LIABILITIES');
    expect(results[2].claimType).toBe('TAXES');
  });

  it('shows remaining cash after each line', () => {
    const claims: WaterfallClaim[] = [
      { priority: 1, claimType: 'INVESTOR_PRINCIPAL', amountClaimed: d(30000) },
      { priority: 2, claimType: 'SUPPLIER_LIABILITIES', amountClaimed: d(15000) },
      { priority: 3, claimType: 'TAXES', amountClaimed: d(5000) },
    ];
    const results = runWaterfall(d(100000), claims);
    expect(results[0].cashAfter.toFixed(2)).toBe('70000.00');
    expect(results[1].cashAfter.toFixed(2)).toBe('55000.00');
    expect(results[2].cashAfter.toFixed(2)).toBe('50000.00');
  });
});
