import { describe, it, expect } from 'vitest';
import { computeBrandScore, allocateOperatingAlpha } from '../brand-score';
import { Decimal, TBC, type BrandScoreInputs, type EngineAllocationInput } from '../types';

function d(v: string | number) {
  return new Decimal(v);
}

describe('computeBrandScore', () => {
  it('computes brand score as (roic * cashConversion * sellThrough * repeatDemand) / operationalRisk', () => {
    const inputs: BrandScoreInputs = {
      roic: d('0.8'),
      cashConversion: d('0.9'),
      sellThrough: d('0.7'),
      repeatDemand: d('0.6'),
      operationalRisk: d('0.5'),
    };
    const score = computeBrandScore(inputs);
    // (0.8 * 0.9 * 0.7 * 0.6) / 0.5 = 0.3024 / 0.5 = 0.6048
    expect(score).not.toBeNull();
    expect(score!.toFixed(4)).toBe('0.6048');
  });

  it('returns null when any input is TBC', () => {
    expect(
      computeBrandScore({
        roic: TBC,
        cashConversion: d('0.9'),
        sellThrough: d('0.7'),
        repeatDemand: d('0.6'),
        operationalRisk: d('0.5'),
      }),
    ).toBeNull();

    expect(
      computeBrandScore({
        roic: d('0.8'),
        cashConversion: d('0.9'),
        sellThrough: TBC,
        repeatDemand: d('0.6'),
        operationalRisk: d('0.5'),
      }),
    ).toBeNull();
  });

  it('throws when operationalRisk is zero', () => {
    expect(() =>
      computeBrandScore({
        roic: d('0.8'),
        cashConversion: d('0.9'),
        sellThrough: d('0.7'),
        repeatDemand: d('0.6'),
        operationalRisk: d('0'),
      }),
    ).toThrow('operationalRisk cannot be zero');
  });
});

describe('allocateOperatingAlpha', () => {
  it('allocates proportionally by brand score for proven engines', () => {
    const engines: EngineAllocationInput[] = [
      { engineCode: 'UNDC', brandScore: d('0.80'), validationGate: false },
      { engineCode: 'ENGINE2', brandScore: d('0.20'), validationGate: false },
    ];
    const results = allocateOperatingAlpha(d(100000), engines);
    const undc = results.find((r) => r.engineCode === 'UNDC')!;
    const eng2 = results.find((r) => r.engineCode === 'ENGINE2')!;

    // UNDC: 80%, ENGINE2: 20% — but ENGINE2 hits the 20% floor
    expect(undc.allocation.plus(eng2.allocation).toFixed(2)).toBe('100000.00');
    expect(eng2.allocation.gte(d(20000))).toBe(true); // 20% floor
  });

  it('caps validation-gate engines at 15%', () => {
    const engines: EngineAllocationInput[] = [
      { engineCode: 'UNDC', brandScore: d('0.80'), validationGate: false },
      { engineCode: 'AFH', brandScore: d('0.50'), validationGate: true },
    ];
    const results = allocateOperatingAlpha(d(100000), engines);
    const afh = results.find((r) => r.engineCode === 'AFH')!;

    expect(afh.allocation.toFixed(2)).toBe('15000.00');
    expect(afh.capped).toBe(true);
  });

  it('caps engines with null brand score (insufficient data)', () => {
    const engines: EngineAllocationInput[] = [
      { engineCode: 'UNDC', brandScore: d('0.80'), validationGate: false },
      { engineCode: 'AFH', brandScore: null, validationGate: true },
    ];
    const results = allocateOperatingAlpha(d(100000), engines);
    const afh = results.find((r) => r.engineCode === 'AFH')!;

    expect(afh.allocation.toFixed(2)).toBe('15000.00');
    expect(afh.capped).toBe(true);
    expect(afh.reason).toContain('insufficient data');
  });

  it('applies 20% floor to proven engines', () => {
    const engines: EngineAllocationInput[] = [
      { engineCode: 'ENG_A', brandScore: d('0.95'), validationGate: false },
      { engineCode: 'ENG_B', brandScore: d('0.05'), validationGate: false },
    ];
    const results = allocateOperatingAlpha(d(100000), engines);
    const engB = results.find((r) => r.engineCode === 'ENG_B')!;

    // Without floor, ENG_B would get ~5%. Floor ensures >= 20%
    expect(engB.allocation.gte(d(20000))).toBe(true);
  });

  it('handles empty engine list', () => {
    const results = allocateOperatingAlpha(d(100000), []);
    expect(results).toHaveLength(0);
  });

  it('handles zero sleeve amount', () => {
    const engines: EngineAllocationInput[] = [
      { engineCode: 'UNDC', brandScore: d('0.80'), validationGate: false },
    ];
    const results = allocateOperatingAlpha(d(0), engines);
    expect(results[0].allocation.toFixed(2)).toBe('0.00');
  });

  it('gives remaining capital to proven engine after validation cap', () => {
    const engines: EngineAllocationInput[] = [
      { engineCode: 'UNDC', brandScore: d('0.80'), validationGate: false },
      { engineCode: 'AFH', brandScore: d('0.50'), validationGate: true },
    ];
    const results = allocateOperatingAlpha(d(100000), engines);
    const undc = results.find((r) => r.engineCode === 'UNDC')!;

    // AFH capped at 15000, UNDC gets remaining 85000
    expect(undc.allocation.toFixed(2)).toBe('85000.00');
  });
});
