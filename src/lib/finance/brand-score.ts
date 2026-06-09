import {
  Decimal,
  ZERO,
  type BrandScoreInputs,
  type EngineAllocationInput,
  isTBC,
} from './types';

const PROVEN_FLOOR_PCT = new Decimal('0.20');
const VALIDATION_CAP_PCT = new Decimal('0.15');

export function computeBrandScore(inputs: BrandScoreInputs): Decimal | null {
  if (
    isTBC(inputs.roic) ||
    isTBC(inputs.cashConversion) ||
    isTBC(inputs.sellThrough) ||
    isTBC(inputs.repeatDemand) ||
    isTBC(inputs.operationalRisk)
  ) {
    return null;
  }

  if (inputs.operationalRisk.isZero()) {
    throw new Error('operationalRisk cannot be zero');
  }

  const numerator = inputs.roic
    .times(inputs.cashConversion)
    .times(inputs.sellThrough)
    .times(inputs.repeatDemand);

  return numerator.div(inputs.operationalRisk);
}

export interface AllocationResult {
  engineCode: string;
  allocation: Decimal;
  allocationPct: Decimal;
  capped: boolean;
  reason: string | null;
}

export function allocateOperatingAlpha(
  sleeveAmount: Decimal,
  engines: EngineAllocationInput[],
): AllocationResult[] {
  if (engines.length === 0) {
    return [];
  }

  if (sleeveAmount.lte(ZERO)) {
    return engines.map((e) => ({
      engineCode: e.engineCode,
      allocation: ZERO,
      allocationPct: ZERO,
      capped: false,
      reason: 'No capital in Operating Alpha sleeve',
    }));
  }

  const proven: EngineAllocationInput[] = [];
  const validation: EngineAllocationInput[] = [];

  for (const engine of engines) {
    if (engine.validationGate) {
      validation.push(engine);
    } else {
      proven.push(engine);
    }
  }

  const results: AllocationResult[] = [];

  let validationTotal = ZERO;
  for (const engine of validation) {
    const capAmount = sleeveAmount.times(VALIDATION_CAP_PCT);
    validationTotal = validationTotal.plus(capAmount);
    results.push({
      engineCode: engine.engineCode,
      allocation: capAmount,
      allocationPct: VALIDATION_CAP_PCT,
      capped: true,
      reason: engine.brandScore === null
        ? 'Validation gate + insufficient data — capped at 15%'
        : 'Validation gate — capped at 15%',
    });
  }

  const remainingForProven = sleeveAmount.minus(validationTotal);

  if (proven.length === 0) {
    return results;
  }

  const scoredProven = proven.filter((e) => e.brandScore !== null);
  const unscoredProven = proven.filter((e) => e.brandScore === null);

  for (const engine of unscoredProven) {
    const capAmount = remainingForProven.times(VALIDATION_CAP_PCT);
    results.push({
      engineCode: engine.engineCode,
      allocation: capAmount,
      allocationPct: VALIDATION_CAP_PCT,
      capped: true,
      reason: 'Insufficient data — capped at 15%',
    });
  }

  const unscoredTotal = remainingForProven
    .times(VALIDATION_CAP_PCT)
    .times(new Decimal(unscoredProven.length));
  const remainingForScored = remainingForProven.minus(unscoredTotal);

  if (scoredProven.length === 0) {
    return results;
  }

  const totalScore = scoredProven.reduce(
    (sum, e) => sum.plus(e.brandScore!),
    ZERO,
  );

  if (totalScore.isZero()) {
    const equalShare = remainingForScored.div(new Decimal(scoredProven.length));
    for (const engine of scoredProven) {
      const pct = equalShare.div(sleeveAmount);
      results.push({
        engineCode: engine.engineCode,
        allocation: equalShare,
        allocationPct: pct,
        capped: false,
        reason: null,
      });
    }
    return results;
  }

  const rawAllocations = scoredProven.map((engine) => {
    const rawPct = engine.brandScore!.div(totalScore);
    return {
      engine,
      rawPct,
      rawAmount: remainingForScored.times(rawPct),
    };
  });

  const floorAmount = remainingForScored.times(PROVEN_FLOOR_PCT);
  let needsRedistribution = true;

  while (needsRedistribution) {
    needsRedistribution = false;
    const belowFloor = rawAllocations.filter((a) => a.rawAmount.lt(floorAmount));
    if (belowFloor.length > 0 && belowFloor.length < rawAllocations.length) {
      const floorTotal = floorAmount.times(new Decimal(belowFloor.length));
      const aboveFloor = rawAllocations.filter((a) => a.rawAmount.gte(floorAmount));
      const aboveFloorScoreTotal = aboveFloor.reduce(
        (sum, a) => sum.plus(a.engine.brandScore!),
        ZERO,
      );
      const remainingAfterFloors = remainingForScored.minus(floorTotal);

      for (const a of belowFloor) {
        a.rawAmount = floorAmount;
        a.rawPct = floorAmount.div(remainingForScored);
      }

      if (aboveFloorScoreTotal.gt(ZERO)) {
        for (const a of aboveFloor) {
          const newPct = a.engine.brandScore!.div(aboveFloorScoreTotal);
          const newAmount = remainingAfterFloors.times(newPct);
          if (newAmount.lt(floorAmount)) {
            needsRedistribution = true;
          }
          a.rawAmount = newAmount;
          a.rawPct = newAmount.div(remainingForScored);
        }
      }
    }
  }

  for (const a of rawAllocations) {
    const pct = a.rawAmount.div(sleeveAmount);
    const isFloored = a.rawAmount.eq(floorAmount) &&
      a.engine.brandScore!.div(totalScore).times(remainingForScored).lt(floorAmount);
    results.push({
      engineCode: a.engine.engineCode,
      allocation: a.rawAmount,
      allocationPct: pct,
      capped: isFloored,
      reason: isFloored ? 'Floor applied — minimum 20% of proven pool' : null,
    });
  }

  return results;
}

export { PROVEN_FLOOR_PCT, VALIDATION_CAP_PCT };
