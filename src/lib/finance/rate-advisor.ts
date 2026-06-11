/**
 * Smart Loan Rate Advisor for LEJ Capital.
 *
 * Recommends an annual loan rate from current fund conditions:
 * T-Bill opportunity cost, borrower risk, term, PCR pressure,
 * loan-book stress, concentration, and operating spread.
 */

import { Decimal } from './types';

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E';

type DecimalInput = Decimal.Value;

export interface RateAdvisorInputs {
  principal: DecimalInput;
  termMonths: number;
  riskGrade: RiskGrade;
  /** Annualised risk-free benchmark rate on 0-1 scale, e.g. 0.109 for 10.9%. */
  tbill91Rate: DecimalInput;
  pcr: DecimalInput;
  pcrStatus: 'GREEN' | 'WATCH' | 'CAUTION' | 'PROTECTION_MODE';
  investorPrincipalDue: DecimalInput;
  currentNAV: DecimalInput;
  par30: DecimalInput;
  par90: DecimalInput;
  defaultRate: DecimalInput;
  loanBookOutstanding: DecimalInput;
  totalProvisions: DecimalInput;
  activeLoanCount: number;
}

export interface RateComponent {
  label: string;
  description: string;
  /** Annual percentage points, e.g. 2.5 means +2.5%. */
  value: Decimal;
}

export interface OpportunityCostComparison {
  tbillReturn: Decimal;
  recommendedGrossInterest: Decimal;
  expectedLoss: Decimal;
  netExpectedSpread: Decimal;
  decision: 'PREFER_LOAN' | 'PREFER_TBILL' | 'REVIEW_REQUIRED';
}

export interface RedTeamFinding {
  severity: 'LOW' | 'WATCH' | 'BREACH';
  finding: string;
  action: string;
}

export interface RateRecommendation {
  recommended: Decimal;
  floor: Decimal;
  ceiling: Decimal;
  components: RateComponent[];
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  expectedLossRate: Decimal;
  opportunityCost: OpportunityCostComparison;
  redTeamFindings: RedTeamFinding[];
  rationale: string;
}

const ONE_HUNDRED = new Decimal(100);

function d(value: DecimalInput): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

function pctPoints(rate: DecimalInput): Decimal {
  return d(rate).times(ONE_HUNDRED);
}

function roundPct(value: Decimal): Decimal {
  return value.toDecimalPlaces(2);
}

function rateComponent(label: string, description: string, value: DecimalInput): RateComponent {
  return { label, description, value: roundPct(d(value)) };
}

function fmtPct(rate: Decimal): string {
  return `${rate.toFixed(2)}%`;
}

function fmtRatio(value: Decimal): string {
  return `${value.toFixed(2)}x`;
}

const GRADE_PREMIUMS: Record<RiskGrade, { premiumPct: Decimal; lossRate: Decimal; label: string }> = {
  A: { premiumPct: new Decimal('0.00'), lossRate: new Decimal('0.0100'), label: 'Prime borrower — minimal credit risk' },
  B: { premiumPct: new Decimal('2.00'), lossRate: new Decimal('0.0200'), label: 'Good credit — low default probability' },
  C: { premiumPct: new Decimal('4.50'), lossRate: new Decimal('0.0500'), label: 'Standard credit — moderate default risk' },
  D: { premiumPct: new Decimal('8.00'), lossRate: new Decimal('0.1000'), label: 'Sub-standard — elevated default risk, needs collateral' },
  E: { premiumPct: new Decimal('13.00'), lossRate: new Decimal('0.1800'), label: 'High-risk — significant default probability, full collateral required' },
};

function getBaseRate(tbill91Rate: Decimal): RateComponent {
  return rateComponent(
    'T-Bill benchmark',
    'Risk-free return LEJ gives up by lending instead of buying Treasury Bills',
    pctPoints(tbill91Rate),
  );
}

function getCreditPremium(grade: RiskGrade): RateComponent {
  const gradeConfig = GRADE_PREMIUMS[grade];
  return rateComponent(`Credit risk (Grade ${grade})`, gradeConfig.label, gradeConfig.premiumPct);
}

function getTermPremium(months: number): RateComponent {
  if (months <= 3) return rateComponent('Term premium', 'Short-term loan — no additional term premium', 0);
  if (months <= 6) return rateComponent('Term premium', 'Medium-term — modest premium for 4-6 month capital lock-up', 1);
  if (months <= 12) return rateComponent('Term premium', 'Long-term — significant capital tied up for 7-12 months', 2.5);
  if (months <= 24) return rateComponent('Term premium', 'Extended term — premium reflects 1-2 year illiquidity and cycle risk', 4);
  return rateComponent('Term premium', 'Multi-year loan — high premium for extended capital commitment', 6);
}

function getPCRAdjustment(pcr: Decimal, pcrStatus: RateAdvisorInputs['pcrStatus']): RateComponent {
  if (pcrStatus === 'GREEN' && pcr.gte('1.25')) {
    return rateComponent('PCR health adjustment', `PCR is strong at ${fmtRatio(pcr)} — fund can price competitively`, -1.5);
  }
  if (pcrStatus === 'GREEN') {
    return rateComponent('PCR health adjustment', `PCR is in the GREEN band at ${fmtRatio(pcr)} — standard pricing`, 0);
  }
  if (pcrStatus === 'WATCH') {
    return rateComponent('PCR health adjustment', `PCR is in WATCH at ${fmtRatio(pcr)} — lending must rebuild protection coverage`, 1.5);
  }
  if (pcrStatus === 'CAUTION') {
    return rateComponent('PCR health adjustment', `PCR is in CAUTION at ${fmtRatio(pcr)} — aggressive pricing required`, 3);
  }
  return rateComponent('PCR health adjustment', `PCR is in PROTECTION MODE at ${fmtRatio(pcr)} — halt or price at maximum spread`, 5);
}

function expectedLossRateFor(inputs: {
  riskGrade: RiskGrade;
  par30: Decimal;
  par90: Decimal;
  defaultRate: Decimal;
}): Decimal {
  const gradeLoss = GRADE_PREMIUMS[inputs.riskGrade].lossRate;
  const portfolioSignal = inputs.par30.times('0.10').plus(inputs.par90.times('0.25')).plus(inputs.defaultRate.times('0.50'));
  return Decimal.max(gradeLoss, portfolioSignal).toDecimalPlaces(6);
}

function getLossLoading(par30: Decimal, par90: Decimal, defaultRate: Decimal, expectedLossRate: Decimal): RateComponent {
  const loadingPct = expectedLossRate.times(ONE_HUNDRED);

  if (loadingPct.lt('0.50')) {
    return rateComponent('Expected loss loading', 'Portfolio health is excellent — minimal loss loading needed', loadingPct);
  }
  if (loadingPct.lt('2.00')) {
    return rateComponent(
      'Expected loss loading',
      `Moderate portfolio stress (PAR30: ${fmtPct(pctPoints(par30))}, PAR90: ${fmtPct(pctPoints(par90))}) — adding loss buffer`,
      loadingPct,
    );
  }
  return rateComponent(
    'Expected loss loading',
    `Portfolio stress/default risk requires a loss buffer (default rate: ${fmtPct(pctPoints(defaultRate))})`,
    loadingPct,
  );
}

function getConcentrationAdjustment(principal: Decimal, nav: Decimal, bookOutstanding: Decimal, loanCount: number): RateComponent {
  const navPct = nav.gt(0) ? principal.div(nav) : new Decimal(0);
  const bookPct = bookOutstanding.gt(0) ? principal.div(bookOutstanding.plus(principal)) : new Decimal(1);
  let adjustment = new Decimal(0);
  const reasons: string[] = [];

  if (navPct.gt('0.15')) {
    adjustment = adjustment.plus(2);
    reasons.push(`loan is ${fmtPct(pctPoints(navPct))} of NAV (>15% threshold)`);
  } else if (navPct.gt('0.08')) {
    adjustment = adjustment.plus('0.75');
    reasons.push(`loan is ${fmtPct(pctPoints(navPct))} of NAV`);
  }

  if (bookPct.gt('0.40') && loanCount <= 3) {
    adjustment = adjustment.plus('1.50');
    reasons.push(`high concentration — ${fmtPct(pctPoints(bookPct))} of book with only ${loanCount} loan(s)`);
  }

  return rateComponent(
    'Concentration risk',
    reasons.length > 0 ? reasons.join('; ') : 'Loan size is diversified relative to fund NAV and loan book',
    adjustment,
  );
}

function getOperatingSpread(): RateComponent {
  return rateComponent('Operating spread', 'Minimum spread for administration, documentation, collections, and governance overhead', 2.5);
}

function compareOpportunityCost(inputs: {
  principal: Decimal;
  termMonths: number;
  tbill91Rate: Decimal;
  recommendedRatePct: Decimal;
  expectedLossRate: Decimal;
}): OpportunityCostComparison {
  const termYears = new Decimal(inputs.termMonths).div(12);
  const tbillReturn = inputs.principal.times(inputs.tbill91Rate).times(termYears);
  const recommendedGrossInterest = inputs.principal.times(inputs.recommendedRatePct.div(ONE_HUNDRED)).times(termYears);
  const expectedLoss = inputs.principal.times(inputs.expectedLossRate);
  const netExpectedSpread = recommendedGrossInterest.minus(expectedLoss).minus(tbillReturn);
  const decision = netExpectedSpread.gt(0)
    ? 'PREFER_LOAN'
    : netExpectedSpread.lt(0)
      ? 'PREFER_TBILL'
      : 'REVIEW_REQUIRED';

  return {
    tbillReturn: tbillReturn.toDecimalPlaces(2),
    recommendedGrossInterest: recommendedGrossInterest.toDecimalPlaces(2),
    expectedLoss: expectedLoss.toDecimalPlaces(2),
    netExpectedSpread: netExpectedSpread.toDecimalPlaces(2),
    decision,
  };
}

function buildRedTeamFindings(inputs: {
  principal: Decimal;
  currentNAV: Decimal;
  investorPrincipalDue: Decimal;
  pcr: Decimal;
  pcrStatus: RateAdvisorInputs['pcrStatus'];
  riskGrade: RiskGrade;
  opportunityCost: OpportunityCostComparison;
  recommended: Decimal;
  floor: Decimal;
  termMonths: number;
}): RedTeamFinding[] {
  const findings: RedTeamFinding[] = [];
  const navPct = inputs.currentNAV.gt(0) ? inputs.principal.div(inputs.currentNAV) : new Decimal(0);
  const principalDuePct = inputs.investorPrincipalDue.gt(0) ? inputs.principal.div(inputs.investorPrincipalDue) : new Decimal(0);

  if (inputs.pcrStatus !== 'GREEN') {
    findings.push({
      severity: inputs.pcrStatus === 'WATCH' ? 'WATCH' : 'BREACH',
      finding: `PCR is ${fmtRatio(inputs.pcr)} (${inputs.pcrStatus}); new lending can worsen liquidity protection.`,
      action: 'Require IC sign-off and confirm this loan does not use Protection or Reserve capital.',
    });
  }

  if (navPct.gt('0.15') || principalDuePct.gt('0.15')) {
    findings.push({
      severity: 'BREACH',
      finding: `Loan size is ${fmtPct(pctPoints(navPct))} of NAV and ${fmtPct(pctPoints(principalDuePct))} of investor principal due.`,
      action: 'Reduce ticket size, syndicate, or require stronger collateral before approval.',
    });
  }

  if (inputs.riskGrade === 'D' || inputs.riskGrade === 'E') {
    findings.push({
      severity: 'BREACH',
      finding: `Borrower is grade ${inputs.riskGrade}, so default risk is elevated.`,
      action: 'Require verified ID, address, collateral proof, and explicit IC approval.',
    });
  }

  if (inputs.opportunityCost.decision !== 'PREFER_LOAN') {
    findings.push({
      severity: 'WATCH',
      finding: 'The safer T-Bill alternative may beat this loan after expected loss.',
      action: 'Either raise rate, shorten term, improve collateral, or deploy to T-Bills instead.',
    });
  }

  if (inputs.recommended.lt(inputs.floor)) {
    findings.push({
      severity: 'BREACH',
      finding: `Recommended rate is below the floor of ${fmtPct(inputs.floor)}.`,
      action: 'Do not approve below floor unless IC documents a strategic reason.',
    });
  }

  if (inputs.termMonths > 12) {
    findings.push({
      severity: 'WATCH',
      finding: 'Term extends beyond one operating year, increasing liquidity and cycle mismatch risk.',
      action: 'Prefer shorter amortization, earlier partial repayments, or stronger collateral.',
    });
  }

  return findings.length > 0
    ? findings
    : [{
        severity: 'LOW',
        finding: 'No major red-team blockers detected from fund-level metrics.',
        action: 'Still verify KYC, collateral, purpose of funds, and repayment source before approval.',
      }];
}

export function computeRecommendedRate(inputs: RateAdvisorInputs): RateRecommendation {
  const principal = d(inputs.principal);
  const tbill91Rate = d(inputs.tbill91Rate);
  const pcr = d(inputs.pcr);
  const currentNAV = d(inputs.currentNAV);
  const investorPrincipalDue = d(inputs.investorPrincipalDue);
  const par30 = d(inputs.par30);
  const par90 = d(inputs.par90);
  const defaultRate = d(inputs.defaultRate);
  const loanBookOutstanding = d(inputs.loanBookOutstanding);
  const expectedLossRate = expectedLossRateFor({ riskGrade: inputs.riskGrade, par30, par90, defaultRate });

  const components: RateComponent[] = [
    getBaseRate(tbill91Rate),
    getCreditPremium(inputs.riskGrade),
    getTermPremium(inputs.termMonths),
    getPCRAdjustment(pcr, inputs.pcrStatus),
    getLossLoading(par30, par90, defaultRate, expectedLossRate),
    getConcentrationAdjustment(principal, currentNAV, loanBookOutstanding, inputs.activeLoanCount),
    getOperatingSpread(),
  ];

  const rawRate = components.reduce((sum, component) => sum.plus(component.value), new Decimal(0));
  const floor = roundPct(pctPoints(tbill91Rate).plus('1.50'));
  const ceiling = Decimal.min(60, pctPoints(tbill91Rate).plus(30)).toDecimalPlaces(2);
  const recommended = Decimal.min(ceiling, Decimal.max(rawRate, pctPoints(tbill91Rate).plus(2))).toDecimalPlaces(2);

  const opportunityCost = compareOpportunityCost({
    principal,
    termMonths: inputs.termMonths,
    tbill91Rate,
    recommendedRatePct: recommended,
    expectedLossRate,
  });

  const riskScore = GRADE_PREMIUMS[inputs.riskGrade].premiumPct
    .plus(inputs.pcrStatus === 'GREEN' ? 0 : inputs.pcrStatus === 'WATCH' ? 2 : 5)
    .plus(par30.gt('0.10') ? 3 : par30.gt('0.05') ? 1 : 0)
    .plus(inputs.termMonths > 12 ? 2 : inputs.termMonths > 6 ? 1 : 0);

  const riskLevel: RateRecommendation['riskLevel'] = riskScore.lte(2)
    ? 'LOW'
    : riskScore.lte(6)
      ? 'MODERATE'
      : riskScore.lte(12)
        ? 'HIGH'
        : 'VERY_HIGH';

  const highComponents = components
    .filter((component) => component.value.gte(2))
    .sort((a, b) => b.value.comparedTo(a.value))
    .slice(0, 3);

  const parts = [`Benchmark T-Bill yield is ${fmtPct(pctPoints(tbill91Rate))}.`];
  if (inputs.pcrStatus !== 'GREEN') {
    parts.push(`PCR is under pressure at ${fmtRatio(pcr)}; higher spreads or no lending may be appropriate.`);
  }
  if (par30.gt('0.05')) {
    parts.push(`Current PAR>30 of ${fmtPct(pctPoints(par30))} signals elevated collection risk.`);
  }
  if (highComponents.length > 0) {
    parts.push(`Key rate drivers: ${highComponents.map((component) => `${component.label} (+${component.value.toFixed(2)}%)`).join(', ')}.`);
  }
  parts.push(
    opportunityCost.decision === 'PREFER_LOAN'
      ? 'Recommended loan pricing beats the T-Bill alternative after expected loss.'
      : 'Recommended pricing needs IC review because T-Bills may be the cleaner risk-adjusted option.',
  );

  return {
    recommended,
    floor,
    ceiling,
    components,
    riskLevel,
    expectedLossRate,
    opportunityCost,
    redTeamFindings: buildRedTeamFindings({
      principal,
      currentNAV,
      investorPrincipalDue,
      pcr,
      pcrStatus: inputs.pcrStatus,
      riskGrade: inputs.riskGrade,
      opportunityCost,
      recommended,
      floor,
      termMonths: inputs.termMonths,
    }),
    rationale: parts.join(' '),
  };
}
