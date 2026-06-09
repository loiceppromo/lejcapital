import { Decimal, ZERO, type PCRResult } from './types';

export interface PCRInputs {
  protectionSleeve: Decimal;
  reserveLiquid: Decimal;
  tbillsMaturingBeforeRepayment: Decimal;
  prepaidRevenueCollected: Decimal;
  investorPrincipalDue: Decimal;
}

const THRESHOLD_TARGET_HIGH = new Decimal('1.25');
const THRESHOLD_TARGET_LOW = new Decimal('1.15');
const THRESHOLD_CAUTION = new Decimal('1.05');
const THRESHOLD_PROTECTION = new Decimal('1.00');

export function computePCR(inputs: PCRInputs): PCRResult {
  const liquidAssets = inputs.protectionSleeve
    .plus(inputs.reserveLiquid)
    .plus(inputs.tbillsMaturingBeforeRepayment)
    .plus(inputs.prepaidRevenueCollected);

  if (inputs.investorPrincipalDue.isZero()) {
    return {
      pcr: new Decimal('999.999999'),
      liquidAssets,
      principalDue: ZERO,
      status: 'GREEN',
    };
  }

  const pcr = liquidAssets.div(inputs.investorPrincipalDue);

  let status: PCRResult['status'];
  if (pcr.gte(THRESHOLD_TARGET_LOW)) {
    status = 'GREEN';
  } else if (pcr.gte(THRESHOLD_CAUTION)) {
    status = 'WATCH';
  } else if (pcr.gte(THRESHOLD_PROTECTION)) {
    status = 'CAUTION';
  } else {
    status = 'PROTECTION_MODE';
  }

  return {
    pcr,
    liquidAssets,
    principalDue: inputs.investorPrincipalDue,
    status,
  };
}

export interface PCRAction {
  threshold: string;
  actions: string[];
}

export function getPCRActions(status: PCRResult['status']): PCRAction | null {
  switch (status) {
    case 'GREEN':
      return null;
    case 'WATCH':
      return {
        threshold: 'PCR < 1.15x',
        actions: [
          'Shift Market Alpha toward Defensive regime',
          'Suspend GSE buying',
        ],
      };
    case 'CAUTION':
      return {
        threshold: 'PCR < 1.05x',
        actions: [
          'Stop redeploying maturing positions',
          'Route proceeds to Protection sleeve',
        ],
      };
    case 'PROTECTION_MODE':
      return {
        threshold: 'PCR < 1.00x',
        actions: [
          'Halt all new operating/market/loan deployment',
          'Route all incoming cash to Protection sleeve',
        ],
      };
  }
}

export { THRESHOLD_TARGET_HIGH, THRESHOLD_TARGET_LOW, THRESHOLD_CAUTION, THRESHOLD_PROTECTION };
