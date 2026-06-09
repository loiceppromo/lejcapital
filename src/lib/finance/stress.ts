import { Decimal, ZERO, ONE, type StressScenarioResult } from './types';
import { computePCR, type PCRInputs } from './pcr';

export interface StressBaseState {
  protectionSleeve: Decimal;
  reserveLiquid: Decimal;
  tbillsMaturingBeforeRepayment: Decimal;
  prepaidRevenueCollected: Decimal;
  investorPrincipalDue: Decimal;
  marketAlphaCurrentValue: Decimal;
  marketAlphaCycleStartValue: Decimal;
  undcProfitExpected: Decimal;
  afhProfitExpected: Decimal;
  loanBookOutstanding: Decimal;
  loanBookProvisions: Decimal;
  currentPAR90: Decimal;
}

export interface StressScenario {
  label: string;
  undcSalesMultiplier?: Decimal;
  marketReturnShock?: Decimal;
  afhSellThroughMultiplier?: Decimal;
  par90Multiplier?: Decimal;
}

export function runStressScenario(
  base: StressBaseState,
  scenario: StressScenario,
): StressScenarioResult {
  const protectionAdjusted = base.protectionSleeve;
  let prepaidAdjusted = base.prepaidRevenueCollected;
  const tbillsAdjusted = base.tbillsMaturingBeforeRepayment;
  let navImpact = ZERO;

  // UNDC sales stress: reduces profit which reduces prepaid revenue
  if (scenario.undcSalesMultiplier) {
    const profitDelta = base.undcProfitExpected.times(
      ONE.minus(scenario.undcSalesMultiplier),
    );
    prepaidAdjusted = prepaidAdjusted.minus(profitDelta);
    if (prepaidAdjusted.lt(ZERO)) prepaidAdjusted = ZERO;
    navImpact = navImpact.minus(profitDelta);
  }

  // Market return shock: affects the liquid tbills component proportionally
  if (scenario.marketReturnShock) {
    const marketLoss = base.marketAlphaCurrentValue.times(
      scenario.marketReturnShock.abs(),
    );
    navImpact = navImpact.minus(marketLoss);
  }

  // AFH sell-through stress
  if (scenario.afhSellThroughMultiplier) {
    const profitDelta = base.afhProfitExpected.times(
      ONE.minus(scenario.afhSellThroughMultiplier),
    );
    prepaidAdjusted = prepaidAdjusted.minus(profitDelta);
    if (prepaidAdjusted.lt(ZERO)) prepaidAdjusted = ZERO;
    navImpact = navImpact.minus(profitDelta);
  }

  // Loan stress: increased PAR90 increases provisions, reducing net loan book value
  if (scenario.par90Multiplier && base.loanBookOutstanding.gt(ZERO)) {
    const currentAtRisk = base.currentPAR90.times(base.loanBookOutstanding);
    const stressedAtRisk = currentAtRisk.times(scenario.par90Multiplier);
    const additionalProvision = stressedAtRisk
      .minus(currentAtRisk)
      .times(new Decimal('0.25')); // substandard rate for new 90+ exposure
    navImpact = navImpact.minus(additionalProvision);
  }

  const pcrInputs: PCRInputs = {
    protectionSleeve: protectionAdjusted,
    reserveLiquid: base.reserveLiquid,
    tbillsMaturingBeforeRepayment: tbillsAdjusted,
    prepaidRevenueCollected: prepaidAdjusted,
    investorPrincipalDue: base.investorPrincipalDue,
  };

  const pcrResult = computePCR(pcrInputs);

  return {
    label: scenario.label,
    pcr: pcrResult.pcr,
    principalCovered: pcrResult.pcr.gte(ONE),
    navImpact,
  };
}

export function buildStandardScenarios(hasAFH: boolean): StressScenario[] {
  const scenarios: StressScenario[] = [
    // UNDC sales stress
    { label: 'UNDC 25% of target', undcSalesMultiplier: new Decimal('0.25') },
    { label: 'UNDC 40% of target', undcSalesMultiplier: new Decimal('0.40') },
    { label: 'UNDC 60% of target', undcSalesMultiplier: new Decimal('0.60') },
    { label: 'UNDC 100% of target', undcSalesMultiplier: new Decimal('1.00') },

    // Market return stress
    { label: 'Market −15%', marketReturnShock: new Decimal('-0.15') },
    { label: 'Market 0%', marketReturnShock: ZERO },
    { label: 'Market base', marketReturnShock: new Decimal('0.06') },
    { label: 'Market bull', marketReturnShock: new Decimal('0.15') },

    // Loan stress
    { label: 'PAR>90 doubles (2x)', par90Multiplier: new Decimal('2') },
    { label: 'PAR>90 triples (3x)', par90Multiplier: new Decimal('3') },
  ];

  if (hasAFH) {
    scenarios.push(
      { label: 'AFH low sell-through', afhSellThroughMultiplier: new Decimal('0.30') },
      { label: 'AFH med sell-through', afhSellThroughMultiplier: new Decimal('0.60') },
      { label: 'AFH high sell-through', afhSellThroughMultiplier: new Decimal('0.90') },
    );
  }

  return scenarios;
}
