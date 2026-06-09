import { describe, it, expect } from 'vitest';
import { runStressScenario, buildStandardScenarios, type StressBaseState } from '../stress';
import { Decimal } from '../types';

function d(v: string | number) {
  return new Decimal(v);
}

const baseState: StressBaseState = {
  protectionSleeve: d(125000),
  reserveLiquid: d(10000),
  tbillsMaturingBeforeRepayment: d(30000),
  prepaidRevenueCollected: d(20000),
  investorPrincipalDue: d(100000),
  marketAlphaCurrentValue: d(150000),
  marketAlphaCycleStartValue: d(150000),
  undcProfitExpected: d(40000),
  afhProfitExpected: d(15000),
  loanBookOutstanding: d(50000),
  loanBookProvisions: d(2500),
  currentPAR90: d('0.05'),
};

describe('runStressScenario', () => {
  it('base case with no stress maintains PCR', () => {
    const result = runStressScenario(baseState, {
      label: 'No stress',
    });
    // Liquid = 125000+10000+30000+20000 = 185000
    // PCR = 185000/100000 = 1.85
    expect(result.pcr.toFixed(2)).toBe('1.85');
    expect(result.principalCovered).toBe(true);
  });

  it('UNDC 25% of target reduces prepaid and impacts PCR', () => {
    const result = runStressScenario(baseState, {
      label: 'UNDC 25%',
      undcSalesMultiplier: d('0.25'),
    });
    // Profit delta = 40000 * (1-0.25) = 30000 lost
    // Prepaid adjusted = max(0, 20000-30000) = 0
    // Liquid = 125000+10000+30000+0 = 165000
    // PCR = 165000/100000 = 1.65
    expect(result.pcr.toFixed(2)).toBe('1.65');
    expect(result.principalCovered).toBe(true);
  });

  it('market -15% impacts NAV but not directly PCR liquid', () => {
    const result = runStressScenario(baseState, {
      label: 'Market -15%',
      marketReturnShock: d('-0.15'),
    });
    // Market loss = 150000 * 0.15 = 22500 NAV impact
    expect(result.navImpact.toFixed(2)).toBe('-22500.00');
    // PCR unchanged since market equities excluded from liquid
    expect(result.pcr.toFixed(2)).toBe('1.85');
  });

  it('PAR>90 tripling increases provisions and hurts NAV', () => {
    const result = runStressScenario(baseState, {
      label: 'PAR>90 triples',
      par90Multiplier: d('3'),
    });
    // Current at risk = 0.05 * 50000 = 2500
    // Stressed at risk = 2500 * 3 = 7500
    // Additional provision = (7500-2500)*0.25 = 1250
    expect(result.navImpact.toFixed(2)).toBe('-1250.00');
  });

  it('combined stress can breach principal coverage', () => {
    const thinState: StressBaseState = {
      ...baseState,
      protectionSleeve: d(60000),
      reserveLiquid: d(5000),
      tbillsMaturingBeforeRepayment: d(10000),
      prepaidRevenueCollected: d(30000),
      investorPrincipalDue: d(100000),
      undcProfitExpected: d(30000),
    };
    // Base liquid = 60000+5000+10000+30000 = 105000, PCR=1.05

    const result = runStressScenario(thinState, {
      label: 'UNDC 25% combined',
      undcSalesMultiplier: d('0.25'),
    });
    // Profit loss = 30000*(1-0.25) = 22500
    // Prepaid = max(0, 30000-22500) = 7500
    // Liquid = 60000+5000+10000+7500 = 82500
    // PCR = 82500/100000 = 0.825
    expect(result.pcr.toNumber()).toBeLessThan(1);
    expect(result.principalCovered).toBe(false);
  });
});

describe('buildStandardScenarios', () => {
  it('includes loan stress scenarios', () => {
    const scenarios = buildStandardScenarios(false);
    const loanScenarios = scenarios.filter((s) => s.par90Multiplier);
    expect(loanScenarios).toHaveLength(2);
    expect(loanScenarios[0].par90Multiplier!.toFixed(0)).toBe('2');
    expect(loanScenarios[1].par90Multiplier!.toFixed(0)).toBe('3');
  });

  it('includes AFH scenarios when hasAFH is true', () => {
    const withAFH = buildStandardScenarios(true);
    const afhScenarios = withAFH.filter((s) => s.afhSellThroughMultiplier);
    expect(afhScenarios.length).toBeGreaterThanOrEqual(3);
  });

  it('excludes AFH scenarios when hasAFH is false', () => {
    const withoutAFH = buildStandardScenarios(false);
    const afhScenarios = withoutAFH.filter((s) => s.afhSellThroughMultiplier);
    expect(afhScenarios).toHaveLength(0);
  });
});
