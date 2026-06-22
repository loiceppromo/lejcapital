/**
 * Capital Allocation Decision Engine.
 *
 * Pure, deterministic, dependency-free analytical core. Given an authoritative
 * financial position, a set of eligible opportunities, hard/soft constraints
 * and scoring weights, it produces up to three RANKED allocation strategies
 * with expected outcomes, risk level, confidence and a plain-language rationale.
 *
 * Principles (see the platform spec):
 *  - Maximise risk-adjusted return SUBJECT TO liquidity, principal protection,
 *    obligations and concentration limits — never headline return alone.
 *  - Hard constraints override the weighted score. A strategy that breaches a
 *    hard control is returned but marked `eligible: false`.
 *  - The engine only RECOMMENDS. It never executes anything.
 *
 * All amounts are GHS numbers. This is an advisory/forecast layer; the ledger
 * remains the Decimal source of truth.
 */

export type AssetClass = 'LIQUIDITY' | 'TBILL' | 'STOCK' | 'BUSINESS' | 'LOAN';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type LiquidityClass = 'LIQUID' | 'SHORT' | 'ILLIQUID';
export type StrategyKey = 'RECOMMENDED' | 'HIGHER_RETURN' | 'MAX_LIQUIDITY';

export interface Opportunity {
  id: string;
  assetClass: Exclude<AssetClass, 'LIQUIDITY'>;
  label: string;
  /** Expected annualised return as a decimal (0.255 = 25.5%). `null` = data missing. */
  expectedAnnualReturn: number | null;
  /** 0 (safe) … 1 (very risky). */
  riskScore: number;
  liquidityClass: LiquidityClass;
  /** Capital lock-up in days. */
  lockupDays: number;
  /** Max GHS that may go into this single opportunity. `null` = uncapped. */
  maxEligible: number | null;
  /** False when key assumptions (e.g. expected return) are not yet captured. */
  dataComplete: boolean;
}

export interface FinancialPosition {
  /** Capital being allocated right now (GHS). */
  availableCapital: number;
  /** Current liquid assets backing the PCR (GHS). */
  liquidAssets: number;
  investorPrincipalDue: number;
  /** Current Protection Cover Ratio. */
  pcr: number;
  pcrStatus: 'GREEN' | 'WATCH' | 'CAUTION' | 'PROTECTION_MODE' | string;
  riskBreaches: number;
  /** Obligations due within the planning horizon (GHS). */
  upcomingObligations: number;
  daysToNextObligation: number | null;
}

export interface AllocationConstraints {
  /** Absolute GHS floor that must always remain liquid. */
  minLiquidityReserve: number;
  /** Approved hard PCR minimum below which risk deployment is restricted. */
  minPcr: number;
  /** PCR the fund aims to restore/maintain. */
  targetPcr: number;
  /** Max share of available capital into equities (0..1). */
  maxEquityPct: number;
  /** Max share of available capital into business funding (0..1). */
  maxBusinessPct: number;
  /** Max share of available capital into illiquid instruments (0..1). */
  maxIlliquidPct: number;
  /** Current total business exposure across the book (GHS). */
  currentBusinessExposure: number;
  /** Absolute GHS ceiling on total business exposure. */
  businessExposureLimit: number;
}

export interface ScoringWeights {
  return: number;
  risk: number;
  liquidity: number;
  principalProtection: number;
  strategicFit: number;
  dataConfidence: number;
}

export interface AllocationInput {
  position: FinancialPosition;
  opportunities: Opportunity[];
  constraints: AllocationConstraints;
  weights: ScoringWeights;
  regime: 'DEFENSIVE' | 'NORMAL' | 'OPPORTUNISTIC';
}

export interface AllocationLine {
  assetClass: AssetClass;
  opportunityId: string | null;
  label: string;
  amount: number;
  pct: number;
}

export interface Strategy {
  key: StrategyKey;
  name: string;
  lines: AllocationLine[];
  expectedAnnualReturn: number;
  /** GHS return over a 1-year horizon on the deployed (non-liquidity) capital. */
  expectedReturnAmount: number;
  projectedLiquidity: number;
  projectedPcr: number;
  riskLevel: RiskLevel;
  maxLockupDays: number;
  advantage: string;
  downside: string;
  confidence: number;
  eligible: boolean;
  constraintViolations: string[];
}

export interface ScoredOpportunity {
  id: string;
  label: string;
  assetClass: AssetClass;
  score: number;
  eligible: boolean;
  rejectionReason: string | null;
}

export interface AllocationRecommendation {
  availableCapital: number;
  restricted: boolean;
  restrictionReason: string | null;
  strategies: Strategy[];
  rationale: string[];
  warnings: string[];
  confidence: number;
  scored: ScoredOpportunity[];
  consideredOpportunities: number;
  rejectedOpportunities: { id: string; label: string; reason: string }[];
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  return: 0.25,
  risk: 0.25,
  liquidity: 0.2,
  principalProtection: 0.15,
  strategicFit: 0.1,
  dataConfidence: 0.05,
};

const PCR_CAP = 999.999999;
/** In restricted mode, the most of available capital that may move into a
 *  short-duration, near-liquid T-Bill while coverage is impaired. */
const RESTRICTED_SHORT_TBILL_FRACTION = 0.34;
const SHORT_DURATION_MAX_DAYS = 95;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Liquid assets + retained cash + short T-Bills count toward coverage. */
function projectPcr(liquidAssets: number, addedLiquid: number, principalDue: number): number {
  if (principalDue <= 0) return PCR_CAP;
  return round2((liquidAssets + addedLiquid) / principalDue);
}

function strategyRiskLevel(deployedRiskWeighted: number, deployedTotal: number, restricted: boolean): RiskLevel {
  if (deployedTotal <= 0) return 'LOW';
  const avg = deployedRiskWeighted / deployedTotal; // 0..1
  if (restricted && avg > 0.2) return 'CRITICAL';
  if (avg >= 0.66) return 'HIGH';
  if (avg >= 0.33) return 'MODERATE';
  return 'LOW';
}

/**
 * Transparent weighted opportunity score in [0,1]. Higher is better.
 * Hard constraints are applied SEPARATELY (eligibility), not here.
 */
function scoreOpportunity(o: Opportunity, weights: ScoringWeights): number {
  const ret = o.expectedAnnualReturn === null ? 0 : clamp(o.expectedAnnualReturn / 0.4, 0, 1); // 40% maps to full marks
  const riskGood = 1 - clamp(o.riskScore, 0, 1);
  const liquidityGood = o.liquidityClass === 'LIQUID' ? 1 : o.liquidityClass === 'SHORT' ? 0.7 : 0.3;
  const principalProtection = o.assetClass === 'TBILL' ? 1 : o.assetClass === 'LOAN' ? 0.6 : 0.3;
  const strategicFit = o.assetClass === 'BUSINESS' ? 0.8 : 0.6;
  const dataConfidence = o.dataComplete ? 1 : 0.4;
  const w = weights;
  const total = w.return + w.risk + w.liquidity + w.principalProtection + w.strategicFit + w.dataConfidence;
  const raw =
    w.return * ret +
    w.risk * riskGood +
    w.liquidity * liquidityGood +
    w.principalProtection * principalProtection +
    w.strategicFit * strategicFit +
    w.dataConfidence * dataConfidence;
  return total > 0 ? raw / total : 0;
}

interface Eligibility {
  eligible: boolean;
  reason: string | null;
  cap: number; // max GHS allocatable to this opportunity under hard rules
}

function evaluateEligibility(
  o: Opportunity,
  input: AllocationInput,
  restricted: boolean,
  investableBudget: number,
): Eligibility {
  const { constraints: c } = input;
  // Hard rule: while coverage is impaired, only short-duration near-liquid
  // principal-protection instruments are eligible.
  if (restricted) {
    if (o.assetClass !== 'TBILL' || o.liquidityClass === 'ILLIQUID' || o.lockupDays > SHORT_DURATION_MAX_DAYS) {
      return { eligible: false, reason: 'Not eligible under current risk controls — principal coverage below minimum.', cap: 0 };
    }
  }
  // Concentration: business exposure ceiling.
  let cap = o.maxEligible ?? investableBudget;
  if (o.assetClass === 'BUSINESS') {
    const headroom = Math.max(0, c.businessExposureLimit - c.currentBusinessExposure);
    if (headroom <= 0) {
      return { eligible: false, reason: 'Business exposure is at the approved concentration limit.', cap: 0 };
    }
    cap = Math.min(cap, headroom, investableBudget * c.maxBusinessPct);
  }
  if (o.assetClass === 'STOCK') {
    cap = Math.min(cap, investableBudget * c.maxEquityPct);
  }
  if (o.liquidityClass === 'ILLIQUID') {
    cap = Math.min(cap, investableBudget * c.maxIlliquidPct);
  }
  cap = Math.min(cap, investableBudget);
  if (cap <= 0) {
    return { eligible: false, reason: 'No allocation headroom remains under the active limits.', cap: 0 };
  }
  return { eligible: true, reason: null, cap: round2(cap) };
}

interface BuiltStrategy {
  lines: AllocationLine[];
  retainedLiquidity: number;
  deployedTotal: number;
  deployedRiskWeighted: number;
  weightedReturn: number; // sum(amount * return)
  maxLockupDays: number;
  usedMissingData: boolean;
}

function buildLines(
  available: number,
  retain: number,
  picks: { o: Opportunity; amount: number }[],
): BuiltStrategy {
  const lines: AllocationLine[] = [];
  let deployedTotal = 0;
  let deployedRiskWeighted = 0;
  let weightedReturn = 0;
  let maxLockupDays = 0;
  let usedMissingData = false;

  for (const { o, amount } of picks) {
    if (amount <= 0) continue;
    deployedTotal += amount;
    deployedRiskWeighted += amount * clamp(o.riskScore, 0, 1);
    weightedReturn += amount * (o.expectedAnnualReturn ?? 0);
    maxLockupDays = Math.max(maxLockupDays, o.lockupDays);
    if (!o.dataComplete) usedMissingData = true;
    lines.push({
      assetClass: o.assetClass,
      opportunityId: o.id,
      label: o.label,
      amount: round2(amount),
      pct: available > 0 ? round2((amount / available) * 100) : 0,
    });
  }
  // Liquidity reserve line first.
  lines.unshift({
    assetClass: 'LIQUIDITY',
    opportunityId: null,
    label: 'Liquidity Reserve',
    amount: round2(retain),
    pct: available > 0 ? round2((retain / available) * 100) : 0,
  });
  return { lines, retainedLiquidity: retain, deployedTotal, deployedRiskWeighted, weightedReturn, maxLockupDays, usedMissingData };
}

function finishStrategy(
  key: StrategyKey,
  name: string,
  built: BuiltStrategy,
  input: AllocationInput,
  restricted: boolean,
  advantage: string,
  downside: string,
  violations: string[],
): Strategy {
  const { position } = input;
  const expectedAnnualReturn = built.deployedTotal > 0 ? built.weightedReturn / built.deployedTotal : 0;
  const expectedReturnAmount = built.weightedReturn; // 1-year horizon estimate
  const projectedLiquidity = round2(built.retainedLiquidity +
    built.lines.filter((l) => l.assetClass === 'TBILL').reduce((s, l) => s + l.amount, 0) * 0); // T-Bills locked, not liquid cash
  // Short T-Bills + retained cash improve coverage.
  const coverageAdd = built.retainedLiquidity +
    built.lines.filter((l) => l.assetClass === 'TBILL' && built.maxLockupDays <= SHORT_DURATION_MAX_DAYS)
      .reduce((s, l) => s + l.amount, 0);
  const projectedPcr = projectPcr(position.liquidAssets, coverageAdd, position.investorPrincipalDue);
  let confidence = 0.9;
  if (built.usedMissingData) confidence -= 0.25;
  // Data-quality signal on the whole analysis: gaps anywhere in the considered
  // opportunity set reduce confidence even if those opportunities weren't used.
  else if (input.opportunities.some((o) => !o.dataComplete)) confidence -= 0.1;
  if (restricted) confidence -= 0.05;
  if (position.riskBreaches > 0) confidence -= 0.03 * Math.min(position.riskBreaches, 3);
  confidence = clamp(round2(confidence), 0.4, 0.99);
  return {
    key,
    name,
    lines: built.lines,
    expectedAnnualReturn: round2(expectedAnnualReturn),
    expectedReturnAmount: round2(expectedReturnAmount),
    projectedLiquidity: round2(built.retainedLiquidity),
    projectedPcr,
    riskLevel: strategyRiskLevel(built.deployedRiskWeighted, built.deployedTotal, restricted),
    maxLockupDays: built.maxLockupDays,
    advantage,
    downside,
    confidence,
    eligible: violations.length === 0,
    constraintViolations: violations,
  };
}

/**
 * Core entry point. Pure: same input → same output.
 */
export function recommendAllocation(input: AllocationInput): AllocationRecommendation {
  const { position, opportunities, constraints: c, weights } = input;
  const available = Math.max(0, position.availableCapital);

  // 1) Restriction gate — coverage impaired or active breaches.
  const restricted =
    position.pcr < c.minPcr ||
    position.riskBreaches > 0 ||
    position.pcrStatus === 'PROTECTION_MODE' ||
    position.pcrStatus === 'CAUTION';
  const restrictionReasons: string[] = [];
  if (position.pcr < c.minPcr) restrictionReasons.push(`PCR ${position.pcr.toFixed(2)}x is below the approved minimum of ${c.minPcr.toFixed(2)}x`);
  if (position.riskBreaches > 0) restrictionReasons.push(`${position.riskBreaches} active risk breach${position.riskBreaches > 1 ? 'es' : ''} unresolved`);
  if (position.investorPrincipalDue > 0 && position.liquidAssets < position.investorPrincipalDue)
    restrictionReasons.push('investor principal coverage must be restored');
  const restrictionReason = restricted ? restrictionReasons.join('; ') : null;

  // 2) Required liquidity retention: obligations + reserve, and (when impaired)
  //    a majority of new capital is held liquid to rebuild coverage.
  const obligationRetention = Math.max(position.upcomingObligations, 0);
  const baseRetention = Math.max(c.minLiquidityReserve, obligationRetention);
  const investableBudget = Math.max(0, available - baseRetention);

  // 3) Score + eligibility for every opportunity.
  const scored: ScoredOpportunity[] = [];
  const rejected: { id: string; label: string; reason: string }[] = [];
  const eligible: { o: Opportunity; score: number; cap: number }[] = [];
  for (const o of opportunities) {
    const score = scoreOpportunity(o, weights);
    const elig = evaluateEligibility(o, input, restricted, investableBudget);
    scored.push({ id: o.id, label: o.label, assetClass: o.assetClass, score: round2(score), eligible: elig.eligible, rejectionReason: elig.reason });
    if (elig.eligible) eligible.push({ o, score, cap: elig.cap });
    else rejected.push({ id: o.id, label: o.label, reason: elig.reason ?? 'ineligible' });
  }
  eligible.sort((a, b) => b.score - a.score);

  const warnings: string[] = [];
  if (opportunities.some((o) => !o.dataComplete)) {
    warnings.push('Recommendation confidence is limited because some opportunity assumptions (e.g. expected return) have not been updated.');
  }
  if (eligible.length === 0 && available > 0) {
    warnings.push('No eligible deployment opportunities under the current risk controls — capital is held as liquidity.');
  }

  // 4) Build the three strategies.
  // RECOMMENDED ----------------------------------------------------------
  let recommended: BuiltStrategy;
  if (restricted) {
    // Retain a majority liquid; deploy a limited slice into the best short T-Bill.
    const tbill = eligible.find((e) => e.o.assetClass === 'TBILL');
    const shortDeploy = tbill ? Math.min(available * RESTRICTED_SHORT_TBILL_FRACTION, tbill.cap, investableBudget) : 0;
    const retain = round2(available - shortDeploy);
    recommended = buildLines(available, retain, tbill && shortDeploy > 0 ? [{ o: tbill.o, amount: shortDeploy }] : []);
  } else {
    // Healthy: deploy investable budget across top eligible opportunities,
    // respecting per-opportunity caps; remainder stays liquid.
    const picks: { o: Opportunity; amount: number }[] = [];
    let remaining = investableBudget;
    for (const e of eligible) {
      if (remaining <= 0) break;
      const amount = Math.min(e.cap, remaining);
      if (amount > 0) { picks.push({ o: e.o, amount }); remaining -= amount; }
    }
    recommended = buildLines(available, round2(available - (investableBudget - remaining)), picks);
  }

  // HIGHER_RETURN --------------------------------------------------------
  // Tilt toward the highest expected-return eligible opportunity. If pushing
  // past a hard control it is reported but flagged ineligible.
  const higherViolations: string[] = [];
  let higher: BuiltStrategy;
  {
    const byReturn = [...eligible].sort((a, b) => (b.o.expectedAnnualReturn ?? 0) - (a.o.expectedAnnualReturn ?? 0));
    const picks: { o: Opportunity; amount: number }[] = [];
    let remaining = investableBudget;
    for (const e of byReturn) {
      if (remaining <= 0) break;
      const amount = Math.min(e.cap, remaining);
      if (amount > 0) { picks.push({ o: e.o, amount }); remaining -= amount; }
    }
    if (restricted && byReturn.length === 0) {
      higherViolations.push('Higher-return deployment is not eligible while principal coverage is below the approved minimum.');
    }
    higher = buildLines(available, round2(available - (investableBudget - remaining)), picks);
  }

  // MAX_LIQUIDITY --------------------------------------------------------
  const maxLiquidity = buildLines(available, available, []);

  const strategies: Strategy[] = [
    finishStrategy(
      'RECOMMENDED',
      restricted ? 'Principal Protection Strategy' : 'Balanced Return Strategy',
      recommended,
      input,
      restricted,
      restricted ? 'Preserves liquidity and rebuilds principal coverage while earning a near-liquid return.' : 'Best risk-adjusted return within all liquidity and concentration limits.',
      restricted ? 'Lower headline return while coverage is restored.' : 'Modest lock-up on the deployed portion.',
      [],
    ),
    finishStrategy(
      'HIGHER_RETURN',
      'Higher-Return Alternative',
      higher,
      input,
      restricted,
      'Tilts toward the highest expected-return eligible opportunities.',
      restricted ? 'Restricted: risk deployment is blocked while coverage is impaired.' : 'Higher volatility and longer lock-up.',
      higherViolations,
    ),
    finishStrategy(
      'MAX_LIQUIDITY',
      'Full Liquidity Preservation',
      maxLiquidity,
      input,
      restricted,
      'Maximum flexibility — all capital remains immediately available.',
      'Earns no return; cash is idle.',
      [],
    ),
  ];

  // 5) Rationale (executive, concise).
  const rationale: string[] = [];
  if (restricted) {
    rationale.push(...restrictionReasons.map((r) => r.charAt(0).toUpperCase() + r.slice(1)));
    if (recommended.deployedTotal > 0) rationale.push('A short-duration Treasury Bill preserves liquidity while generating a return.');
    rationale.push('Equity and business deployment would increase current risk exposure and is temporarily restricted.');
  } else {
    rationale.push('Principal coverage is healthy and no breaches are active.');
    if (recommended.deployedTotal > 0) rationale.push('Capital is deployed into the highest risk-adjusted eligible opportunities within concentration and liquidity limits.');
    rationale.push(`A minimum liquidity reserve of GHS ${c.minLiquidityReserve.toLocaleString('en-US', { minimumFractionDigits: 2 })} is retained.`);
  }
  if (position.daysToNextObligation !== null && position.upcomingObligations > 0) {
    rationale.push(`GHS ${position.upcomingObligations.toLocaleString('en-US', { minimumFractionDigits: 2 })} is retained for an obligation due in ${position.daysToNextObligation} days.`);
  }

  const confidence = strategies[0].confidence;
  return {
    availableCapital: round2(available),
    restricted,
    restrictionReason,
    strategies,
    rationale,
    warnings,
    confidence,
    scored,
    consideredOpportunities: opportunities.length,
    rejectedOpportunities: rejected,
  };
}
