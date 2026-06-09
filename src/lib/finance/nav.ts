import { Decimal } from './types';

export interface NAVInputs {
  protectionSleeve: Decimal;
  reserveTotal: Decimal;
  marketAlphaCurrentValue: Decimal;
  operatingAlphaDeployed: Decimal;
  loanBookNetValue: Decimal;
  cash: Decimal;
}

export function computeNAV(inputs: NAVInputs): Decimal {
  return inputs.protectionSleeve
    .plus(inputs.reserveTotal)
    .plus(inputs.marketAlphaCurrentValue)
    .plus(inputs.operatingAlphaDeployed)
    .plus(inputs.loanBookNetValue)
    .plus(inputs.cash);
}

export interface CycleOpeningNAVInputs {
  priorRetainedCapital: Decimal;
  newContributions: Decimal;
}

export function computeOpeningNAV(inputs: CycleOpeningNAVInputs): Decimal {
  return inputs.priorRetainedCapital.plus(inputs.newContributions);
}
