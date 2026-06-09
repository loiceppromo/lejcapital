import { describe, it, expect } from 'vitest';
import { computeNAV, computeOpeningNAV } from '../nav';
import { Decimal } from '../types';

function d(v: string | number) {
  return new Decimal(v);
}

describe('computeNAV', () => {
  it('sums all components including loan book net value', () => {
    const nav = computeNAV({
      protectionSleeve: d(50000),
      reserveTotal: d(15000),
      marketAlphaCurrentValue: d(120000),
      operatingAlphaDeployed: d(80000),
      loanBookNetValue: d(45000),
      cash: d(10000),
    });
    expect(nav.toFixed(2)).toBe('320000.00');
  });

  it('loan book uses net value (outstanding - provisions)', () => {
    const navGross = computeNAV({
      protectionSleeve: d(50000),
      reserveTotal: d(15000),
      marketAlphaCurrentValue: d(120000),
      operatingAlphaDeployed: d(80000),
      loanBookNetValue: d(50000), // gross
      cash: d(10000),
    });
    const navNet = computeNAV({
      protectionSleeve: d(50000),
      reserveTotal: d(15000),
      marketAlphaCurrentValue: d(120000),
      operatingAlphaDeployed: d(80000),
      loanBookNetValue: d(45000), // net of 5000 provision
      cash: d(10000),
    });
    expect(navGross.minus(navNet).toFixed(2)).toBe('5000.00');
  });
});

describe('computeOpeningNAV', () => {
  it('equals prior retained capital + new contributions', () => {
    const nav = computeOpeningNAV({
      priorRetainedCapital: d(30000),
      newContributions: d(70000),
    });
    expect(nav.toFixed(2)).toBe('100000.00');
  });

  it('works with zero retained (first cycle)', () => {
    const nav = computeOpeningNAV({
      priorRetainedCapital: d(0),
      newContributions: d(100000),
    });
    expect(nav.toFixed(2)).toBe('100000.00');
  });
});
