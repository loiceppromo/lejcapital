import {
  Decimal,
  TBC,
  allocateOperatingAlpha,
  buildStandardScenarios,
  computeBrandScore,
  computeDefaultRate,
  computeNAV,
  computeNetLoanBookValue,
  computeOutstandingBalance,
  computePAR,
  computePCR,
  computeProvision,
  computeWeightedAvgRate,
  evaluateMarketPolicy,
  getPCRActions,
  runStressScenario,
  type BrandScoreInputs,
} from '@/lib/finance';
import { totalInvestorPrincipalDue, buildInvestorStatement } from '@/lib/fund/investors';
import { platformState } from './seed-data';
import type { LiquidityCliffRadar, LoanPricingContext, PlatformState, RiskState } from './types';

export { loanAsOfDate } from './seed-data';

export function money(value: Decimal | null): string {
  return value ? `GHS ${value.toNumber().toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'TBC';
}

export function pct(value: Decimal | null): string {
  return value ? `${value.times(100).toFixed(2)}%` : 'TBC';
}

export function ratio(value: Decimal | null): string {
  return value ? `${value.toFixed(2)}x` : 'TBC';
}

/** Synchronous — returns seed data only. Used by client components and AppShell. */
export function getPlatformState(): PlatformState {
  return platformState;
}

export function getActiveCycle(state = platformState) {
  return state.cycles.find((cycle) => cycle.id === state.activeCycleId) ?? state.cycles[0];
}

export function getActiveSleeves(state = platformState) {
  return state.sleevesByCycle[getActiveCycle(state).id] ?? [];
}

export function getSleeveAmount(type: string, state = platformState) {
  return getActiveSleeves(state).find((sleeve) => sleeve.type === type)?.fundedAmount ?? new Decimal(0);
}

export function getInvestorPrincipalDue(state = platformState) {
  return totalInvestorPrincipalDue(getActiveCycle(state).id, state.contributions);
}

export function getMarketHoldings(state = platformState) {
  return state.marketHoldings.filter((holding) => holding.cycleId === getActiveCycle(state).id);
}

export function getLoanSummaries(state = platformState) {
  const activeCycle = getActiveCycle(state);
  return state.loans
    .filter((loan) => loan.fundingCycleId === activeCycle.id)
    .map((loan) => {
      const principalPaid = state.loanRepayments
        .filter((repayment) => repayment.loanId === loan.id)
        .reduce((sum, repayment) => sum.plus(repayment.allocatedToPrincipal), new Decimal(0));
      const outstandingPrincipal = computeOutstandingBalance(loan.principal, principalPaid);
      const maxDaysPastDue = state.loanSchedules
        .filter((item) => item.loanId === loan.id && item.status !== 'PAID')
        .reduce((max, item) => Math.max(max, item.daysPastDue), 0);
      const provisionAmount = computeProvision(outstandingPrincipal, maxDaysPastDue);
      const status =
        loan.status === 'WRITTEN_OFF' || loan.status === 'PAID_OFF'
          ? loan.status
          : outstandingPrincipal.isZero()
            ? 'PAID_OFF'
            : maxDaysPastDue > loan.defaultCutoffDays
              ? 'DEFAULTED'
              : loan.status;

      return {
        loan,
        borrower: state.borrowers.find((borrower) => borrower.id === loan.borrowerId),
        outstandingPrincipal,
        maxDaysPastDue,
        provisionAmount,
        status,
        netValue: outstandingPrincipal.minus(provisionAmount),
      };
    });
}

export function getLoanMetrics(state = platformState) {
  const summaries = getLoanSummaries(state);
  const loanInputs = summaries.map((summary) => ({
    outstandingPrincipal: summary.outstandingPrincipal,
    maxDaysPastDue: summary.maxDaysPastDue,
    status: summary.status,
  }));
  const totalOutstanding = summaries.reduce((sum, item) => sum.plus(item.outstandingPrincipal), new Decimal(0));
  const totalProvisions = summaries.reduce((sum, item) => sum.plus(item.provisionAmount), new Decimal(0));

  return {
    summaries,
    totalOutstanding,
    totalProvisions,
    netValue: computeNetLoanBookValue(summaries.map((summary) => ({
      outstandingPrincipal: summary.outstandingPrincipal,
      provisionAmount: summary.provisionAmount,
    }))),
    par30: computePAR(loanInputs, 30),
    par90: computePAR(loanInputs, 90),
    defaultRate: computeDefaultRate(loanInputs),
    weightedRate: computeWeightedAvgRate(summaries.map((summary) => ({
      outstandingPrincipal: summary.outstandingPrincipal,
      interestRate: summary.loan.interestRate,
    }))),
  };
}

export function getMarketPolicy(state = platformState) {
  const activeCycle = getActiveCycle(state);
  const holdings = getMarketHoldings(state);
  const marketAlpha = getSleeveAmount('MARKET_ALPHA', state).plus(getSleeveAmount('LOAN_BOOK', state));
  const principalDue = getInvestorPrincipalDue(state);
  const pcr = getPCR(state);
  const triggerRecord = state.opportunisticTriggers.find((trigger) => trigger.cycleId === activeCycle.id);

  return evaluateMarketPolicy({
    requestedRegime: state.requestedRegime,
    triggers: {
      pcrAbove125: pcr.pcr.gte('1.25'),
      undcDemandValidated: triggerRecord?.undcDemandValidated ?? false,
      marketCatalystDocumented: triggerRecord?.marketCatalystDocumented ?? false,
      noOpenOperationalIssues: triggerRecord?.noOpenOperationalIssues ?? false,
    },
    holdings: holdings.map((holding) => ({
      instrumentType: holding.instrumentType,
      name: holding.name,
      amountInvested: holding.amountInvested,
      currentValue: holding.currentValue,
      maturityDate: holding.maturityDate ? new Date(holding.maturityDate) : null,
      purchaseDate: new Date(holding.purchaseDate),
    })),
    marketAlphaStartValue: marketAlpha,
    marketAlphaCurrentValue: marketAlpha,
    nav: activeCycle.openingNAV ?? principalDue,
  });
}

export function getPCR(state = platformState) {
  const activeCycle = getActiveCycle(state);
  const holdings = getMarketHoldings(state);
  const tbillsMaturingBeforeRepayment = holdings
    .filter(
      (holding) =>
        holding.instrumentType === 'TBILL' &&
        holding.maturityDate &&
        new Date(holding.maturityDate).getTime() <= new Date(activeCycle.endDate).getTime(),
    )
    .reduce((sum, holding) => sum.plus(holding.currentValue), new Decimal(0));

  return computePCR({
    protectionSleeve: getSleeveAmount('PROTECTION', state),
    reserveLiquid: getSleeveAmount('RESERVE', state),
    tbillsMaturingBeforeRepayment,
    prepaidRevenueCollected: new Decimal(0),
    investorPrincipalDue: getInvestorPrincipalDue(state),
  });
}

export function getEngineAllocation(state = platformState) {
  const activeCycle = getActiveCycle(state);
  const records = state.engineRecords.filter((engine) => engine.cycleId === activeCycle.id && engine.status !== 'EXITED');
  const scores = records.map((engine) => {
    const inputs: BrandScoreInputs = {
      roic: engine.roic ?? TBC,
      cashConversion: engine.cashConversion ?? TBC,
      sellThrough: engine.sellThrough ?? TBC,
      repeatDemand: engine.repeatDemand ?? TBC,
      operationalRisk: engine.operationalRisk ?? TBC,
    };
    const brandScore = computeBrandScore(inputs);
    return { engine, brandScore, insufficientData: brandScore === null };
  });
  const allocations = allocateOperatingAlpha(
    getSleeveAmount('OPERATING_ALPHA', state),
    scores.map((score) => ({
      engineCode: score.engine.code,
      brandScore: score.brandScore,
      validationGate: score.engine.validationGate || score.insufficientData,
    })),
  );

  return { scores, allocations };
}

export function getOverview(state = platformState) {
  const activeCycle = getActiveCycle(state);
  const pcr = getPCR(state);
  const loanMetrics = getLoanMetrics(state);
  const marketPolicy = getMarketPolicy(state);
  const currentNAV = computeNAV({
    protectionSleeve: getSleeveAmount('PROTECTION', state),
    reserveTotal: getSleeveAmount('RESERVE', state),
    marketAlphaCurrentValue: marketPolicy.currentValues.total,
    operatingAlphaDeployed: getSleeveAmount('OPERATING_ALPHA', state),
    loanBookNetValue: loanMetrics.netValue,
    cash: marketPolicy.currentValues.cash,
  });

  const riskItems = getRiskItems(state);
  const actionRequired = riskItems
    .filter((item) => item.state !== 'GREEN')
    .slice(0, 6)
    .map((item) => `${item.label}: ${item.action}`);

  return {
    activeCycle,
    pcr,
    pcrActions: getPCRActions(pcr.status),
    investorPrincipalDue: getInvestorPrincipalDue(state),
    currentNAV,
    loanMetrics,
    marketPolicy,
    actionRequired,
    riskBreaches: riskItems.filter((item) => item.state === 'BREACH').length,
  };
}

export function getLoanPricingContext(state = platformState): LoanPricingContext {
  const overview = getOverview(state);
  const activeCycle = getActiveCycle(state);
  const holdings = getMarketHoldings(state);
  const tbillHolding = holdings.find((holding) => holding.instrumentType === 'TBILL' && holding.returnRate !== null);
  const annualizedTbillRate = tbillHolding?.returnRate ? tbillHolding.returnRate.times(4) : null;

  return {
    tbill91Rate: annualizedTbillRate?.toFixed(6) ?? null,
    pcr: overview.pcr.pcr.toFixed(6),
    pcrStatus: overview.pcr.status,
    investorPrincipalDue: overview.investorPrincipalDue.toFixed(2),
    currentNAV: overview.currentNAV.toFixed(2),
    par30: overview.loanMetrics.par30.toFixed(6),
    par90: overview.loanMetrics.par90.toFixed(6),
    defaultRate: overview.loanMetrics.defaultRate.toFixed(6),
    loanBookOutstanding: overview.loanMetrics.totalOutstanding.toFixed(2),
    totalProvisions: overview.loanMetrics.totalProvisions.toFixed(2),
    activeLoanCount: overview.loanMetrics.summaries.filter((summary) => summary.loan.fundingCycleId === activeCycle.id && summary.status === 'ACTIVE').length,
  };
}

export function getLiquidityCliffRadar(state = platformState): LiquidityCliffRadar {
  const activeCycle = getActiveCycle(state);
  const pcr = getPCR(state);
  const investorPrincipalDue = getInvestorPrincipalDue(state);
  const availableBuffer = pcr.liquidAssets.minus(investorPrincipalDue);
  const cycleStart = new Date(activeCycle.startDate);
  const cycleEnd = new Date(activeCycle.endDate);
  const asOf = new Date();
  const boundedAsOf = asOf < cycleStart ? cycleStart : asOf > cycleEnd ? cycleEnd : asOf;
  const elapsedDays = Math.max(1, Math.ceil((boundedAsOf.getTime() - cycleStart.getTime()) / 86_400_000));
  const daysUntilCycleEnd = Math.max(0, Math.ceil((cycleEnd.getTime() - boundedAsOf.getTime()) / 86_400_000));
  const activeEntries = state.ledgerEntries.filter((entry) => entry.cycleId === activeCycle.id || !entry.cycleId);
  const outflowsToDate = activeEntries
    .filter((entry) => entry.direction === 'OUT' && new Date(entry.date).getTime() <= boundedAsOf.getTime())
    .reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0));
  const inflowsToDate = activeEntries
    .filter((entry) => entry.direction === 'IN' && new Date(entry.date).getTime() <= boundedAsOf.getTime())
    .reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0));
  const netBurnToDate = Decimal.max(new Decimal(0), outflowsToDate.minus(inflowsToDate));
  const dailyBurn = elapsedDays > 0 ? netBurnToDate.div(elapsedDays) : new Decimal(0);
  const scheduledLoanDisbursements = state.loans
    .filter((loan) => loan.fundingCycleId === activeCycle.id && loan.status === 'PENDING')
    .reduce((sum, loan) => sum.plus(loan.principal), new Decimal(0));
  const projectedOutflows = dailyBurn.times(daysUntilCycleEnd).plus(scheduledLoanDisbursements);
  const stressBuffer = availableBuffer.minus(projectedOutflows);
  const daysUntilCliff = dailyBurn.gt(0) && availableBuffer.gt(0)
    ? Math.max(0, Math.floor(availableBuffer.div(dailyBurn).toNumber()))
    : null;
  const cliffDate = daysUntilCliff === null
    ? null
    : new Date(boundedAsOf.getTime() + daysUntilCliff * 86_400_000).toISOString().slice(0, 10);
  const status: RiskState = availableBuffer.lt(0) || stressBuffer.lt(0)
    ? 'BREACH'
    : daysUntilCliff !== null && daysUntilCliff <= 21
      ? 'WATCH'
      : 'GREEN';

  return {
    status,
    liquidAssets: pcr.liquidAssets,
    protectedAmount: investorPrincipalDue,
    availableBuffer,
    projectedOutflows,
    daysUntilCycleEnd,
    daysUntilCliff,
    cliffDate,
    action: status === 'BREACH'
      ? 'Freeze new deployments and route incoming cash to Protection.'
      : status === 'WATCH'
        ? 'Review upcoming outflows before approving new loans or market buys.'
        : 'Liquidity buffer covers projected cycle obligations.',
    drivers: [
      `Liquid assets: ${money(pcr.liquidAssets)}`,
      `Investor principal due: ${money(investorPrincipalDue)}`,
      `Projected remaining outflows: ${money(projectedOutflows)}`,
      `Days left in cycle: ${daysUntilCycleEnd}`,
    ],
  };
}

export function getRiskItems(state = platformState): Array<{ label: string; value: string; state: RiskState; action: string }> {
  const pcr = getPCR(state);
  const marketPolicy = getMarketPolicy(state);
  const loanMetrics = getLoanMetrics(state);
  const activeCycle = getActiveCycle(state);
  const principalDue = getInvestorPrincipalDue(state);
  const currentNAV = computeNAV({
    protectionSleeve: getSleeveAmount('PROTECTION', state),
    reserveTotal: getSleeveAmount('RESERVE', state),
    marketAlphaCurrentValue: marketPolicy.currentValues.total,
    operatingAlphaDeployed: getSleeveAmount('OPERATING_ALPHA', state),
    loanBookNetValue: loanMetrics.netValue,
    cash: marketPolicy.currentValues.cash,
  });
  const undc = state.engineRecords.find((engine) => engine.cycleId === activeCycle.id && engine.code === 'UNDC');

  return [
    {
      label: 'NAV',
      value: money(currentNAV),
      state: currentNAV.gte(principalDue) ? 'GREEN' : 'BREACH',
      action: currentNAV.gte(principalDue) ? 'Maintain controls' : 'Halt deployment and rebuild coverage',
    },
    {
      label: 'PCR',
      value: ratio(pcr.pcr),
      state: pcr.status === 'GREEN' ? 'GREEN' : pcr.status === 'WATCH' ? 'WATCH' : 'BREACH',
      action: getPCRActions(pcr.status)?.actions[0] ?? 'Maintain protection band',
    },
    {
      label: 'GSE exposure',
      value: pct(marketPolicy.gseExposure.currentPct),
      state: marketPolicy.gseExposure.withinLimit ? 'GREEN' : 'BREACH',
      action: marketPolicy.gseExposure.withinLimit ? 'Maintain regime split' : 'Rebalance to hard ceiling',
    },
    {
      label: 'Loan PAR > 30',
      value: pct(loanMetrics.par30),
      state: loanMetrics.par30.lte('0.05') ? 'GREEN' : loanMetrics.par30.lte('0.15') ? 'WATCH' : 'BREACH',
      action: loanMetrics.par30.lte('0.15') ? 'Monitor collections' : 'Freeze new loan deployment',
    },
    {
      label: 'UNDC sales vs target',
      value: pct(undc?.salesVsTarget ?? null),
      state: undc?.salesVsTarget?.gte('0.70') ? 'GREEN' : undc?.salesVsTarget?.gte('0.40') ? 'WATCH' : 'BREACH',
      action: 'IC suggested action: increase / maintain / reduce / exit',
    },
  ];
}

export function getStressResults(state = platformState) {
  const pcr = getPCR(state);
  const marketPolicy = getMarketPolicy(state);
  const loanMetrics = getLoanMetrics(state);
  return buildStandardScenarios(false).map((scenario) =>
    runStressScenario(
      {
        protectionSleeve: getSleeveAmount('PROTECTION', state),
        reserveLiquid: getSleeveAmount('RESERVE', state),
        tbillsMaturingBeforeRepayment: pcr.liquidAssets.minus(getSleeveAmount('PROTECTION', state)).minus(getSleeveAmount('RESERVE', state)),
        prepaidRevenueCollected: new Decimal(0),
        investorPrincipalDue: getInvestorPrincipalDue(state),
        marketAlphaCurrentValue: getSleeveAmount('MARKET_ALPHA', state).plus(getSleeveAmount('LOAN_BOOK', state)),
        marketAlphaCycleStartValue: marketPolicy.currentValues.total,
        undcProfitExpected: new Decimal(0),
        afhProfitExpected: new Decimal(0),
        loanBookOutstanding: loanMetrics.totalOutstanding,
        loanBookProvisions: loanMetrics.totalProvisions,
        currentPAR90: loanMetrics.par90,
      },
      scenario,
    ),
  );
}

export function getWaterfall(state = platformState) {
  const activeCycle = getActiveCycle(state);
  return state.waterfallRuns.find((run) => run.cycleId === activeCycle.id)?.lines ?? [];
}

export function getMissingData(state = platformState) {
  const activeCycle = getActiveCycle(state);
  return [
    ...state.engineRecords.flatMap((engine) =>
      engine.cycleId === activeCycle.id
        ? (['roic', 'cashConversion', 'sellThrough', 'repeatDemand', 'operationalRisk'] as const)
            .filter((field) => engine[field] === null)
            .map((field) => ({
              entity: `Engine ${engine.code}`,
              entityType: 'EngineCycleRecord',
              entityId: engine.id,
              field,
              blocking: field === 'sellThrough' || field === 'operationalRisk',
            }))
        : [],
    ),
    ...state.borrowers
      .filter((borrower) => borrower.idNumber === 'TBC')
      .map((borrower) => ({
        entity: `Borrower ${borrower.name}`,
        entityType: 'Borrower',
        entityId: borrower.id,
        field: 'idNumber',
        blocking: true,
      })),
  ];
}

export function getInvestorStatements(state = platformState) {
  return state.investors.map((investor) => buildInvestorStatement(investor, state.contributions, state.repayments));
}

/**
 * Extract trend data from report snapshots for sparklines.
 * Returns an array of numeric values sorted by snapshot date.
 */
export function getTrendData(
  field: 'currentNAV' | 'pcr' | 'investorPrincipalDue' | 'netLoanBookValue' | 'totalProvisions' | 'marketPortfolioValue' | 'riskBreaches',
  state = platformState,
): number[] {
  const snapshots = [...state.reportSnapshots]
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));

  return snapshots.map((snap) => {
    const raw = snap[field];
    if (typeof raw === 'number') return raw;
    const num = parseFloat(raw);
    return isNaN(num) ? 0 : num;
  });
}
