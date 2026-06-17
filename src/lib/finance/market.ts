import { Decimal, ZERO, type Regime, type RegimeSplit, type ReturnScenario } from './types';

export const REGIME_SPLITS: Record<Regime, RegimeSplit> = {
  DEFENSIVE: {
    gsePct: new Decimal('0.35'),
    tbillPct: new Decimal('0.55'),
    cashPct: new Decimal('0.10'),
  },
  NORMAL: {
    gsePct: new Decimal('0.55'),
    tbillPct: new Decimal('0.35'),
    cashPct: new Decimal('0.10'),
  },
  OPPORTUNISTIC: {
    gsePct: new Decimal('0.70'),
    tbillPct: new Decimal('0.25'),
    cashPct: new Decimal('0.05'),
  },
};

export const GSE_HARD_CEILING_PCT = new Decimal('0.70');
export const SINGLE_NAME_MARKET_ALPHA_LIMIT = new Decimal('0.25');
export const SINGLE_NAME_NAV_LIMIT = new Decimal('0.15');
export const MIN_NAMES_NORMAL_OPPORTUNISTIC = 4;
export const DRAWDOWN_FLAG_PCT = new Decimal('0.12');
export const DRAWDOWN_LIQUIDATE_PCT = new Decimal('0.20');

export interface OpportunisticTriggers {
  pcrAbove125: boolean;
  undcDemandValidated: boolean;
  marketCatalystDocumented: boolean;
  noOpenOperationalIssues: boolean;
}

export function canUseOpportunistic(triggers: OpportunisticTriggers): boolean {
  return (
    triggers.pcrAbove125 &&
    triggers.undcDemandValidated &&
    triggers.marketCatalystDocumented &&
    triggers.noOpenOperationalIssues
  );
}

export function resolveRegime(
  requested: Regime,
  triggers: OpportunisticTriggers,
): Regime {
  if (requested === 'OPPORTUNISTIC' && !canUseOpportunistic(triggers)) {
    return 'NORMAL';
  }
  return requested;
}

export function blendedMarketReturn(
  regime: Regime,
  scenario: ReturnScenario,
  assumptions: {
    gseRate: Decimal;
    tbillRate: Decimal;
    cashRate: Decimal;
  },
): Decimal {
  const split = REGIME_SPLITS[regime];
  return split.gsePct
    .times(assumptions.gseRate)
    .plus(split.tbillPct.times(assumptions.tbillRate))
    .plus(split.cashPct.times(assumptions.cashRate));
}

export interface DrawdownCheck {
  currentValue: Decimal;
  cycleStartValue: Decimal;
}

export type DrawdownStatus = 'NORMAL' | 'FLAG' | 'LIQUIDATE';

export function checkDrawdown(input: DrawdownCheck): {
  status: DrawdownStatus;
  drawdownPct: Decimal;
  actions: string[];
} {
  if (input.cycleStartValue.isZero()) {
    return { status: 'NORMAL', drawdownPct: ZERO, actions: [] };
  }

  const loss = input.cycleStartValue.minus(input.currentValue);
  if (loss.lte(ZERO)) {
    return { status: 'NORMAL', drawdownPct: ZERO, actions: [] };
  }

  const drawdownPct = loss.div(input.cycleStartValue);

  if (drawdownPct.gte(DRAWDOWN_LIQUIDATE_PCT)) {
    return {
      status: 'LIQUIDATE',
      drawdownPct,
      actions: [
        'Liquidate all GSE equities to T-Bills/cash for the remainder of the cycle',
      ],
    };
  }

  if (drawdownPct.gte(DRAWDOWN_FLAG_PCT)) {
    return {
      status: 'FLAG',
      drawdownPct,
      actions: [
        'Switch to Defensive regime',
        'Halt all GSE buying',
      ],
    };
  }

  return { status: 'NORMAL', drawdownPct, actions: [] };
}

export function singleNameLimit(
  marketAlphaTotal: Decimal,
  nav: Decimal,
): Decimal {
  const limitByMA = marketAlphaTotal.times(SINGLE_NAME_MARKET_ALPHA_LIMIT);
  const limitByNAV = nav.times(SINGLE_NAME_NAV_LIMIT);
  return Decimal.min(limitByMA, limitByNAV);
}

export function checkGSEExposure(
  gseTotal: Decimal,
  marketAlphaTotal: Decimal,
): { withinLimit: boolean; currentPct: Decimal; ceiling: Decimal } {
  if (marketAlphaTotal.isZero()) {
    return {
      withinLimit: gseTotal.isZero(),
      currentPct: ZERO,
      ceiling: ZERO,
    };
  }
  const currentPct = gseTotal.div(marketAlphaTotal);
  const ceiling = marketAlphaTotal.times(GSE_HARD_CEILING_PCT);
  return {
    withinLimit: gseTotal.lte(ceiling),
    currentPct,
    ceiling,
  };
}

export interface MarketHoldingForPolicy {
  instrumentType: 'GSE_EQUITY' | 'TBILL' | 'CASH';
  name: string;
  amountInvested: Decimal;
  currentValue: Decimal;
  maturityDate?: Date | null;
  purchaseDate?: Date | null;
}

export interface SingleNameExposureCheck {
  name: string;
  currentValue: Decimal;
  limit: Decimal;
  withinLimit: boolean;
}

export interface MarketPolicyEvaluation {
  requestedRegime: Regime;
  effectiveRegime: Regime;
  regimeWasDowngraded: boolean;
  targetSplit: RegimeSplit;
  targetAmounts: {
    gse: Decimal;
    tbill: Decimal;
    cash: Decimal;
  };
  currentValues: {
    gse: Decimal;
    tbill: Decimal;
    cash: Decimal;
    total: Decimal;
  };
  drawdown: ReturnType<typeof checkDrawdown>;
  gseExposure: ReturnType<typeof checkGSEExposure>;
  singleNameChecks: SingleNameExposureCheck[];
  minNamesSatisfied: boolean;
  actions: string[];
}

export interface MarketTradePrecheckInput {
  side: 'BUY' | 'SELL';
  instrumentType: 'GSE_EQUITY' | 'TBILL' | 'CASH';
  name: string;
  grossAmount: Decimal;
  fees: Decimal;
  holdings: MarketHoldingForPolicy[];
  policy: MarketPolicyEvaluation;
  marketAlphaCurrentValue: Decimal;
  nav: Decimal;
  existingHoldingValue?: Decimal;
}

export interface MarketTradePrecheck {
  approved: boolean;
  projectedGseValue: Decimal;
  projectedGsePct: Decimal;
  projectedSingleNameValue: Decimal | null;
  blockers: string[];
  warnings: string[];
}

export function evaluateMarketTradePrecheck(input: MarketTradePrecheckInput): MarketTradePrecheck {
  const gross = Decimal.max(input.grossAmount, ZERO);
  const fees = Decimal.max(input.fees, ZERO);
  const cashImpact = input.side === 'BUY' ? gross.plus(fees) : gross.minus(fees);
  const gseCurrent = input.policy.currentValues.gse;
  const existingSingleNameValue = input.existingHoldingValue ?? input.holdings
    .filter((holding) => holding.instrumentType === 'GSE_EQUITY' && holding.name.toLowerCase() === input.name.toLowerCase())
    .reduce((sum, holding) => sum.plus(holding.currentValue), ZERO);

  let projectedGseValue = gseCurrent;
  let projectedSingleNameValue: Decimal | null = input.instrumentType === 'GSE_EQUITY' ? existingSingleNameValue : null;

  if (input.instrumentType === 'GSE_EQUITY') {
    if (input.side === 'BUY') {
      projectedGseValue = projectedGseValue.plus(gross);
      projectedSingleNameValue = existingSingleNameValue.plus(gross);
    } else {
      projectedGseValue = Decimal.max(ZERO, projectedGseValue.minus(gross));
      projectedSingleNameValue = Decimal.max(ZERO, existingSingleNameValue.minus(gross));
    }
  }

  const projectedGsePct = input.marketAlphaCurrentValue.isZero()
    ? ZERO
    : projectedGseValue.div(input.marketAlphaCurrentValue);
  const singleLimit = singleNameLimit(input.marketAlphaCurrentValue, input.nav);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (input.side === 'BUY' && input.instrumentType === 'GSE_EQUITY' && input.policy.drawdown.status !== 'NORMAL') {
    blockers.push('GSE buys are halted while market drawdown controls are active.');
  }
  if (input.side === 'BUY' && input.instrumentType === 'GSE_EQUITY' && projectedGseValue.gt(input.policy.gseExposure.ceiling)) {
    blockers.push('Projected GSE exposure breaches the 70% hard ceiling.');
  }
  if (
    input.side === 'BUY' &&
    input.instrumentType === 'GSE_EQUITY' &&
    projectedSingleNameValue !== null &&
    projectedSingleNameValue.gt(singleLimit)
  ) {
    blockers.push('Projected single-name exposure breaches the lower of 25% Market Alpha or 15% NAV.');
  }
  if (input.side === 'SELL' && input.instrumentType === 'GSE_EQUITY' && gross.gt(existingSingleNameValue)) {
    blockers.push('Sell amount is greater than the current value recorded for this GSE holding.');
  }
  if (input.side === 'SELL' && fees.gt(gross)) {
    blockers.push('Fees cannot exceed gross sale proceeds.');
  }
  if (input.side === 'BUY' && input.instrumentType === 'GSE_EQUITY' && !input.policy.minNamesSatisfied) {
    warnings.push('Normal/Opportunistic regimes require at least 4 GSE names; this trade should improve diversification or be documented.');
  }
  if (input.side === 'BUY' && cashImpact.gt(input.marketAlphaCurrentValue)) {
    warnings.push('Trade size is larger than recorded Market Alpha value; confirm available cash before execution.');
  }

  return {
    approved: blockers.length === 0,
    projectedGseValue,
    projectedGsePct,
    projectedSingleNameValue,
    blockers,
    warnings,
  };
}

export function evaluateMarketPolicy(input: {
  requestedRegime: Regime;
  triggers: OpportunisticTriggers;
  holdings: MarketHoldingForPolicy[];
  marketAlphaStartValue: Decimal;
  marketAlphaCurrentValue: Decimal;
  nav: Decimal;
}): MarketPolicyEvaluation {
  const effectiveRegime = resolveRegime(input.requestedRegime, input.triggers);
  const targetSplit = REGIME_SPLITS[effectiveRegime];
  const gseHoldings = input.holdings.filter((holding) => holding.instrumentType === 'GSE_EQUITY');

  const currentValues = input.holdings.reduce(
    (acc, holding) => {
      if (holding.instrumentType === 'GSE_EQUITY') acc.gse = acc.gse.plus(holding.currentValue);
      if (holding.instrumentType === 'TBILL') acc.tbill = acc.tbill.plus(holding.currentValue);
      if (holding.instrumentType === 'CASH') acc.cash = acc.cash.plus(holding.currentValue);
      acc.total = acc.total.plus(holding.currentValue);
      return acc;
    },
    { gse: ZERO, tbill: ZERO, cash: ZERO, total: ZERO },
  );

  const drawdown = checkDrawdown({
    currentValue: input.marketAlphaCurrentValue,
    cycleStartValue: input.marketAlphaStartValue,
  });
  const gseExposure = checkGSEExposure(currentValues.gse, input.marketAlphaCurrentValue);
  const singleLimit = singleNameLimit(input.marketAlphaCurrentValue, input.nav);
  const singleNameChecks = gseHoldings.map((holding) => ({
    name: holding.name,
    currentValue: holding.currentValue,
    limit: singleLimit,
    withinLimit: holding.currentValue.lte(singleLimit),
  }));
  const minNamesSatisfied =
    effectiveRegime === 'DEFENSIVE' || new Set(gseHoldings.map((holding) => holding.name)).size >= MIN_NAMES_NORMAL_OPPORTUNISTIC;

  const actions: string[] = [];
  if (effectiveRegime !== input.requestedRegime) {
    actions.push('Opportunistic gate failed; default to Normal regime.');
  }
  actions.push(...drawdown.actions);
  if (!gseExposure.withinLimit) {
    actions.push('Rebalance GSE exposure to the 70% hard ceiling.');
  }
  if (singleNameChecks.some((check) => !check.withinLimit)) {
    actions.push('Reduce single-name GSE positions above the lower of 25% Market Alpha or 15% NAV.');
  }
  if (!minNamesSatisfied) {
    actions.push('Add GSE diversification before using Normal or Opportunistic regime.');
  }

  return {
    requestedRegime: input.requestedRegime,
    effectiveRegime,
    regimeWasDowngraded: effectiveRegime !== input.requestedRegime,
    targetSplit,
    targetAmounts: {
      gse: input.marketAlphaCurrentValue.times(targetSplit.gsePct),
      tbill: input.marketAlphaCurrentValue.times(targetSplit.tbillPct),
      cash: input.marketAlphaCurrentValue.times(targetSplit.cashPct),
    },
    currentValues,
    drawdown,
    gseExposure,
    singleNameChecks,
    minNamesSatisfied,
    actions,
  };
}
