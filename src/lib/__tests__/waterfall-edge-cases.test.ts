/**
 * Tests for waterfall distribution edge cases.
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '@/lib/finance';
import { runWaterfall, WATERFALL_PRIORITIES } from '@/lib/finance/waterfall';
import type { WaterfallClaim } from '@/lib/finance';

function claim(priority: number, claimType: string, amount: number): WaterfallClaim {
  return { priority, claimType, amountClaimed: new Decimal(amount) };
}

describe('runWaterfall', () => {
  it('pays all claims when cash is sufficient', () => {
    const results = runWaterfall(new Decimal('100000'), [
      claim(1, 'INVESTOR_PRINCIPAL', 40000),
      claim(2, 'SUPPLIER_LIABILITIES', 20000),
      claim(3, 'TAXES', 10000),
    ]);

    expect(results).toHaveLength(3);
    expect(results[0].fullyPaid).toBe(true);
    expect(results[0].amountPaid.toNumber()).toBe(40000);
    expect(results[1].fullyPaid).toBe(true);
    expect(results[2].fullyPaid).toBe(true);
    expect(results[2].cashAfter.toNumber()).toBe(30000);
  });

  it('pays in priority order when cash is insufficient', () => {
    const results = runWaterfall(new Decimal('50000'), [
      claim(1, 'INVESTOR_PRINCIPAL', 40000),
      claim(2, 'SUPPLIER_LIABILITIES', 20000),
      claim(3, 'TAXES', 10000),
    ]);

    expect(results[0].fullyPaid).toBe(true);
    expect(results[0].amountPaid.toNumber()).toBe(40000);
    expect(results[1].fullyPaid).toBe(false);
    expect(results[1].amountPaid.toNumber()).toBe(10000); // only 10k remaining
    expect(results[2].fullyPaid).toBe(false);
    expect(results[2].amountPaid.toNumber()).toBe(0); // nothing left
  });

  it('handles zero cash', () => {
    const results = runWaterfall(new Decimal(0), [
      claim(1, 'INVESTOR_PRINCIPAL', 50000),
      claim(2, 'TAXES', 10000),
    ]);

    expect(results[0].fullyPaid).toBe(false);
    expect(results[0].amountPaid.toNumber()).toBe(0);
    expect(results[1].fullyPaid).toBe(false);
    expect(results[1].amountPaid.toNumber()).toBe(0);
  });

  it('handles empty claims list', () => {
    const results = runWaterfall(new Decimal('100000'), []);
    expect(results).toEqual([]);
  });

  it('sorts claims by priority regardless of input order', () => {
    const results = runWaterfall(new Decimal('50000'), [
      claim(3, 'TAXES', 20000),
      claim(1, 'INVESTOR_PRINCIPAL', 30000),
      claim(2, 'SUPPLIER_LIABILITIES', 20000),
    ]);

    expect(results[0].claimType).toBe('INVESTOR_PRINCIPAL');
    expect(results[0].amountPaid.toNumber()).toBe(30000);
    expect(results[1].claimType).toBe('SUPPLIER_LIABILITIES');
    expect(results[1].amountPaid.toNumber()).toBe(20000);
    expect(results[2].claimType).toBe('TAXES');
    expect(results[2].amountPaid.toNumber()).toBe(0);
  });

  it('handles exact cash match for a single claim', () => {
    const results = runWaterfall(new Decimal('50000'), [
      claim(1, 'INVESTOR_PRINCIPAL', 50000),
    ]);

    expect(results[0].fullyPaid).toBe(true);
    expect(results[0].cashAfter.toNumber()).toBe(0);
  });

  it('handles large numbers of claims', () => {
    const claims = Array.from({ length: 8 }, (_, i) =>
      claim(i + 1, WATERFALL_PRIORITIES[i].claimType, 10000),
    );
    const results = runWaterfall(new Decimal('45000'), claims);
    // First 4 fully paid (40000), 5th partially paid (5000)
    expect(results.filter((r) => r.fullyPaid)).toHaveLength(4);
    expect(results[4].amountPaid.toNumber()).toBe(5000);
    expect(results[5].amountPaid.toNumber()).toBe(0);
  });

  it('partial payment shows correct cashAfter', () => {
    const results = runWaterfall(new Decimal('25000'), [
      claim(1, 'INVESTOR_PRINCIPAL', 20000),
      claim(2, 'SUPPLIER_LIABILITIES', 15000),
    ]);

    expect(results[0].cashAfter.toNumber()).toBe(5000);
    expect(results[1].cashAfter.toNumber()).toBe(0);
  });
});

describe('WATERFALL_PRIORITIES', () => {
  it('has 8 priority levels', () => {
    expect(WATERFALL_PRIORITIES).toHaveLength(8);
  });

  it('starts with INVESTOR_PRINCIPAL at priority 1', () => {
    expect(WATERFALL_PRIORITIES[0]).toEqual({
      priority: 1,
      claimType: 'INVESTOR_PRINCIPAL',
    });
  });

  it('ends with EXPANSION at priority 8', () => {
    expect(WATERFALL_PRIORITIES[7]).toEqual({
      priority: 8,
      claimType: 'EXPANSION',
    });
  });

  it('has strictly ascending priorities', () => {
    for (let i = 1; i < WATERFALL_PRIORITIES.length; i++) {
      expect(WATERFALL_PRIORITIES[i].priority).toBeGreaterThan(
        WATERFALL_PRIORITIES[i - 1].priority,
      );
    }
  });
});
