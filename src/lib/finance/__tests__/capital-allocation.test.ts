import { describe, it, expect } from 'vitest';
import {
  recommendAllocation,
  DEFAULT_SCORING_WEIGHTS,
  type AllocationInput,
  type AllocationConstraints,
  type Opportunity,
} from '../capital-allocation';

const CONSTRAINTS: AllocationConstraints = {
  minLiquidityReserve: 0,
  minPcr: 1.0,
  targetPcr: 1.15,
  maxEquityPct: 0.3,
  maxBusinessPct: 0.4,
  maxIlliquidPct: 0.5,
  currentBusinessExposure: 0,
  businessExposureLimit: 100_000,
};

const TBILL: Opportunity = {
  id: 'tbill-91', assetClass: 'TBILL', label: '91-Day Treasury Bill',
  expectedAnnualReturn: 0.255, riskScore: 0.05, liquidityClass: 'SHORT', lockupDays: 91, maxEligible: null, dataComplete: true,
};
const STOCK: Opportunity = {
  id: 'mtngh', assetClass: 'STOCK', label: 'MTNGH', expectedAnnualReturn: 0.3, riskScore: 0.7,
  liquidityClass: 'LIQUID', lockupDays: 0, maxEligible: null, dataComplete: true,
};
const BUSINESS: Opportunity = {
  id: 'undc', assetClass: 'BUSINESS', label: 'UNDC', expectedAnnualReturn: 0.4, riskScore: 0.6,
  liquidityClass: 'ILLIQUID', lockupDays: 180, maxEligible: null, dataComplete: true,
};

function input(overrides: Partial<AllocationInput>): AllocationInput {
  return {
    position: {
      availableCapital: 3000, liquidAssets: 0, investorPrincipalDue: 0,
      pcr: 1.4, pcrStatus: 'GREEN', riskBreaches: 0, upcomingObligations: 0, daysToNextObligation: null,
    },
    opportunities: [TBILL, STOCK, BUSINESS],
    constraints: CONSTRAINTS,
    weights: DEFAULT_SCORING_WEIGHTS,
    regime: 'NORMAL',
    ...overrides,
  };
}

const liquidity = (r: { strategies: { lines: { assetClass: string; amount: number }[] }[] }) =>
  r.strategies[0].lines.find((l) => l.assetClass === 'LIQUIDITY')!.amount;
const lineFor = (s: { lines: { assetClass: string; amount: number }[] }, cls: string) =>
  s.lines.filter((l) => l.assetClass === cls).reduce((a, l) => a + l.amount, 0);

describe('Scenario 1 — low PCR with active breaches', () => {
  const rec = recommendAllocation(input({
    position: { availableCapital: 3000, liquidAssets: 0, investorPrincipalDue: 87000, pcr: 0, pcrStatus: 'PROTECTION_MODE', riskBreaches: 3, upcomingObligations: 0, daysToNextObligation: null },
  }));

  it('restricts risky deployment', () => {
    expect(rec.restricted).toBe(true);
    expect(rec.restrictionReason).toMatch(/PCR/i);
    // stocks & businesses are not eligible
    expect(rec.scored.find((s) => s.id === 'mtngh')!.eligible).toBe(false);
    expect(rec.scored.find((s) => s.id === 'undc')!.eligible).toBe(false);
  });

  it('recommends liquidity + a short principal-protection instrument', () => {
    const top = rec.strategies[0];
    expect(top.name).toBe('Principal Protection Strategy');
    expect(lineFor(top, 'STOCK')).toBe(0);
    expect(lineFor(top, 'BUSINESS')).toBe(0);
    expect(lineFor(top, 'LIQUIDITY')).toBeGreaterThan(lineFor(top, 'TBILL')); // majority liquid
    expect(lineFor(top, 'TBILL')).toBeGreaterThan(0); // some near-liquid return
  });

  it('improves projected coverage and explains why', () => {
    expect(rec.strategies[0].projectedPcr).toBeGreaterThan(0);
    expect(rec.rationale.join(' ')).toMatch(/breach|coverage|principal/i);
  });

  it('higher-return alternative is blocked under restriction (needs override)', () => {
    const higher = rec.strategies.find((s) => s.key === 'HIGHER_RETURN')!;
    // only TBILL is eligible while restricted, so a "higher return" tilt cannot add risk
    expect(lineFor(higher, 'STOCK')).toBe(0);
    expect(lineFor(higher, 'BUSINESS')).toBe(0);
  });
});

describe('Scenario 2 — healthy capital position', () => {
  const rec = recommendAllocation(input({
    position: { availableCapital: 10000, liquidAssets: 70000, investorPrincipalDue: 50000, pcr: 1.4, pcrStatus: 'GREEN', riskBreaches: 0, upcomingObligations: 0, daysToNextObligation: null },
    constraints: { ...CONSTRAINTS, minLiquidityReserve: 2000 },
  }));

  it('is not restricted and deploys capital', () => {
    expect(rec.restricted).toBe(false);
    expect(rec.strategies[0].name).toBe('Balanced Return Strategy');
    const deployed = rec.strategies[0].lines.filter((l) => l.assetClass !== 'LIQUIDITY').reduce((a, l) => a + l.amount, 0);
    expect(deployed).toBeGreaterThan(0);
  });

  it('shows expected return and a risk level', () => {
    expect(rec.strategies[0].expectedAnnualReturn).toBeGreaterThan(0);
    expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(rec.strategies[0].riskLevel);
  });

  it('retains at least the minimum liquidity reserve', () => {
    expect(liquidity(rec)).toBeGreaterThanOrEqual(2000);
  });
});

describe('Scenario 3 — upcoming obligation', () => {
  const rec = recommendAllocation(input({
    position: { availableCapital: 5000, liquidAssets: 60000, investorPrincipalDue: 50000, pcr: 1.2, pcrStatus: 'GREEN', riskBreaches: 0, upcomingObligations: 4000, daysToNextObligation: 20 },
  }));

  it('retains liquidity for the obligation, reducing investable capital', () => {
    expect(liquidity(rec)).toBeGreaterThanOrEqual(4000);
    const deployed = rec.strategies[0].lines.filter((l) => l.assetClass !== 'LIQUIDITY').reduce((a, l) => a + l.amount, 0);
    expect(deployed).toBeLessThanOrEqual(1000);
  });
});

describe('Scenario 4 — concentration risk', () => {
  const rec = recommendAllocation(input({
    position: { availableCapital: 10000, liquidAssets: 70000, investorPrincipalDue: 50000, pcr: 1.4, pcrStatus: 'GREEN', riskBreaches: 0, upcomingObligations: 0, daysToNextObligation: null },
    constraints: { ...CONSTRAINTS, currentBusinessExposure: 100_000, businessExposureLimit: 100_000 },
  }));

  it('rejects further business allocation and recommends another class', () => {
    expect(rec.rejectedOpportunities.find((r) => r.id === 'undc')!.reason).toMatch(/concentration limit/i);
    expect(lineFor(rec.strategies[0], 'BUSINESS')).toBe(0);
    const deployedNonBusiness = lineFor(rec.strategies[0], 'TBILL') + lineFor(rec.strategies[0], 'STOCK');
    expect(deployedNonBusiness).toBeGreaterThan(0);
  });
});

describe('Scenario 5 — incomplete data', () => {
  const rec = recommendAllocation(input({
    position: { availableCapital: 10000, liquidAssets: 70000, investorPrincipalDue: 50000, pcr: 1.4, pcrStatus: 'GREEN', riskBreaches: 0, upcomingObligations: 0, daysToNextObligation: null },
    opportunities: [TBILL, { ...BUSINESS, expectedAnnualReturn: null, dataComplete: false }],
  }));

  it('warns about missing data and lowers confidence without inventing returns', () => {
    expect(rec.warnings.join(' ')).toMatch(/not been updated|limited/i);
    expect(rec.confidence).toBeLessThan(0.9);
    // the data-missing business contributes 0 expected return (no fabrication)
    const businessScore = rec.scored.find((s) => s.id === 'undc')!.score;
    const tbillScore = rec.scored.find((s) => s.id === 'tbill-91')!.score;
    expect(tbillScore).toBeGreaterThan(businessScore);
  });
});

describe('Scenario 6 — override: high-risk tilt under restriction is ineligible', () => {
  const rec = recommendAllocation(input({
    position: { availableCapital: 3000, liquidAssets: 0, investorPrincipalDue: 87000, pcr: 0, pcrStatus: 'PROTECTION_MODE', riskBreaches: 3, upcomingObligations: 0, daysToNextObligation: null },
    opportunities: [STOCK, BUSINESS], // no eligible safe instrument
  }));

  it('flags the higher-return strategy as not eligible under risk controls', () => {
    const higher = rec.strategies.find((s) => s.key === 'HIGHER_RETURN')!;
    expect(higher.eligible).toBe(false);
    expect(higher.constraintViolations.length).toBeGreaterThan(0);
    // recommended holds everything liquid since nothing is eligible
    expect(liquidity(rec)).toBe(3000);
  });
});

describe('engine invariants', () => {
  it('never executes — only recommends three ranked strategies', () => {
    const rec = recommendAllocation(input({}));
    expect(rec.strategies).toHaveLength(3);
    expect(rec.strategies.map((s) => s.key)).toEqual(['RECOMMENDED', 'HIGHER_RETURN', 'MAX_LIQUIDITY']);
  });

  it('allocations never exceed available capital', () => {
    const rec = recommendAllocation(input({}));
    for (const s of rec.strategies) {
      const total = s.lines.reduce((a, l) => a + l.amount, 0);
      expect(total).toBeLessThanOrEqual(rec.availableCapital + 0.01);
    }
  });
});
