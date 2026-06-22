/**
 * Capital-allocation data bridge.
 *
 * Builds the pure decision-engine input from the authoritative live platform
 * state — PCR, breaches, liquidity, obligations and the REAL opportunity set
 * (existing T-Bill/equity holdings and operating businesses). It never
 * fabricates opportunity data: where return assumptions are missing the
 * opportunity is still surfaced but flagged `dataComplete: false`, which the
 * engine turns into a confidence penalty and a missing-data warning.
 */
import { Decimal } from '@/lib/finance';
import {
  recommendAllocation,
  DEFAULT_SCORING_WEIGHTS,
  type AllocationInput,
  type AllocationRecommendation,
  type Opportunity,
  type ScoringWeights,
} from '@/lib/finance/capital-allocation';
import { getOverview, getActiveCycle, getActiveSleeves } from './selectors';
import { platformState } from './seed-data';
import type { PlatformState } from './types';

const num = (d: Decimal | null | undefined): number => (d ? d.toNumber() : 0);
const CYCLES_PER_YEAR = 4; // quarterly cycles → annualise per-cycle rates

function daysBetween(from: Date, toIso: string): number | null {
  const to = new Date(toIso);
  if (Number.isNaN(to.getTime())) return null;
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/** Derive the real, eligible opportunity set from current holdings + ventures. */
export function buildOpportunities(state: PlatformState = platformState): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const activeCycle = getActiveCycle(state);
  const holdings = state.marketHoldings.filter((h) => h.cycleId === activeCycle.id);

  // Treasury Bills — derive a 91-day instrument from a real T-Bill rate.
  const tbill = holdings.find((h) => h.instrumentType === 'TBILL' && h.returnRate !== null);
  if (tbill) {
    opportunities.push({
      id: 'tbill-91',
      assetClass: 'TBILL',
      label: '91-Day Treasury Bill',
      expectedAnnualReturn: num(tbill.returnRate) * CYCLES_PER_YEAR,
      riskScore: 0.05,
      liquidityClass: 'SHORT',
      lockupDays: 91,
      maxEligible: null,
      dataComplete: true,
    });
  }

  // Equities — one opportunity per distinct GSE holding the desk already tracks.
  for (const h of holdings.filter((x) => x.instrumentType === 'GSE_EQUITY')) {
    opportunities.push({
      id: `stock-${h.id}`,
      assetClass: 'STOCK',
      label: h.name,
      expectedAnnualReturn: h.returnRate !== null ? num(h.returnRate) * CYCLES_PER_YEAR : null,
      riskScore: 0.65,
      liquidityClass: 'LIQUID',
      lockupDays: 0,
      maxEligible: null,
      dataComplete: h.returnRate !== null,
    });
  }

  // Businesses — eligible operating engines, scored from their latest cycle record.
  for (const engine of state.engines) {
    if (engine.status === 'EXITED') continue;
    const record = state.engineRecords
      .filter((r) => r.engineId === engine.id)
      .sort((a, b) => (b.cycleId > a.cycleId ? 1 : -1))[0];
    const roic = record?.roic ?? null;
    const opRisk = record?.operationalRisk ?? null;
    opportunities.push({
      id: `business-${engine.id}`,
      assetClass: 'BUSINESS',
      label: engine.name,
      expectedAnnualReturn: roic !== null ? num(roic) : null,
      riskScore: opRisk !== null ? Math.min(num(opRisk), 1) : 0.6,
      liquidityClass: 'ILLIQUID',
      lockupDays: 180,
      maxEligible: null,
      dataComplete: roic !== null,
    });
  }

  return opportunities;
}

/** Assemble the full engine input from live state for a given amount of capital. */
export function buildAllocationInput(
  availableCapital: number,
  state: PlatformState = platformState,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): AllocationInput {
  const overview = getOverview(state);
  const activeCycle = getActiveCycle(state);
  const currentNAV = num(overview.currentNAV);

  // Business concentration: capital already committed to ventures this cycle.
  const currentBusinessExposure = getActiveSleeves(state)
    .filter((s) => s.type === 'OPERATING_ALPHA')
    .reduce((sum, s) => sum + num(s.fundedAmount), 0);

  // Obligation horizon: investor principal due as the cycle approaches its end.
  const principalDue = num(overview.investorPrincipalDue);
  const daysToCycleEnd = daysBetween(new Date(activeCycle.startDate), activeCycle.endDate);
  const obligationDueSoon = daysToCycleEnd !== null && daysToCycleEnd <= 30;

  return {
    position: {
      availableCapital,
      liquidAssets: num(overview.pcr.liquidAssets),
      investorPrincipalDue: principalDue,
      pcr: num(overview.pcr.pcr),
      pcrStatus: overview.pcr.status,
      riskBreaches: overview.riskBreaches,
      upcomingObligations: obligationDueSoon ? principalDue : 0,
      daysToNextObligation: obligationDueSoon ? daysToCycleEnd : null,
    },
    opportunities: buildOpportunities(state),
    constraints: {
      minLiquidityReserve: 0,
      minPcr: 1.0,
      targetPcr: 1.15,
      maxEquityPct: 0.3,
      maxBusinessPct: 0.4,
      maxIlliquidPct: 0.5,
      currentBusinessExposure,
      businessExposureLimit: currentNAV > 0 ? currentNAV * 0.5 : Number.MAX_SAFE_INTEGER,
    },
    weights,
    regime: overview.marketPolicy.effectiveRegime ?? 'NORMAL',
  };
}

/** Authoritative server-side recommendation for a given available amount. */
export function recommendForAvailableCapital(
  availableCapital: number,
  state: PlatformState = platformState,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): AllocationRecommendation {
  return recommendAllocation(buildAllocationInput(availableCapital, state, weights));
}
