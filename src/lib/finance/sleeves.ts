import { Decimal, ZERO } from './types';

export interface SleeveAllocationInput {
  totalCapital: Decimal;
  retainedCapital: Decimal;
  newContributions: Decimal;
  investorPrincipalDue: Decimal;
  pcrTargetHigh: Decimal;
  reserveFloorAmount: Decimal;
}

export interface SleeveAllocationResult {
  protection: Decimal;
  reserve: Decimal;
  operatingAlpha: Decimal;
  marketAlpha: Decimal;
  loanBook: Decimal;
  warnings: string[];
}

export function allocateSleeves(input: SleeveAllocationInput): SleeveAllocationResult {
  const warnings: string[] = [];
  let remaining = input.totalCapital;

  // 1. Protection — fund to achieve PCR target (1.25x)
  const protectionTarget = input.investorPrincipalDue.times(input.pcrTargetHigh);
  const protection = Decimal.min(protectionTarget, remaining);
  remaining = remaining.minus(protection);

  if (protection.lt(protectionTarget)) {
    warnings.push(
      `Protection underfunded: ${protection.toFixed(2)} vs target ${protectionTarget.toFixed(2)}`,
    );
  }

  // 2. Reserve — fund to floor
  const reserve = Decimal.min(input.reserveFloorAmount, remaining);
  remaining = remaining.minus(reserve);

  if (reserve.lt(input.reserveFloorAmount)) {
    warnings.push(
      `Reserve underfunded: ${reserve.toFixed(2)} vs floor ${input.reserveFloorAmount.toFixed(2)}`,
    );
  }

  // 3. Operating Alpha — funded ONLY from new investor contributions (never retained)
  const availableForOA = Decimal.min(input.newContributions, remaining);
  // For now, allocate all available new contributions to OA;
  // actual amount will be determined by brand score allocation
  const operatingAlpha = availableForOA;
  remaining = remaining.minus(operatingAlpha);

  // 4. Market Alpha = everything remaining (includes retained that wasn't used above)
  const marketAlpha = remaining;

  // Loan Book starts at zero; funded from Market Alpha deployment decisions
  const loanBook = ZERO;

  // Validation: retained capital must not flow to Operating Alpha
  const retainedInOA = input.retainedCapital.gt(ZERO) &&
    operatingAlpha.gt(input.newContributions);
  if (retainedInOA) {
    warnings.push('VIOLATION: Retained capital flowing to Operating Alpha');
  }

  return {
    protection,
    reserve,
    operatingAlpha,
    marketAlpha,
    loanBook,
    warnings,
  };
}

export function validateRetainedCapitalRule(
  operatingAlphaFunded: Decimal,
  newContributions: Decimal,
): boolean {
  return operatingAlphaFunded.lte(newContributions);
}
