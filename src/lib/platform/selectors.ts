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
import type { PlatformState, RiskState } from './types';

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
    marketAlphaStartValue: marketAlpha.plus(new Decimal(12000)),
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
    prepaidRevenueCollected: new Decimal(5000),
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
  const afh = state.engineRecords.find((engine) => engine.cycleId === activeCycle.id && engine.code === 'AFH');

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
    {
      label: 'AFH sell-through',
      value: pct(afh?.sellThroughRate ?? null),
      state: afh?.sellThroughRate === null || afh?.sellThroughRate === undefined ? 'WATCH' : afh.sellThroughRate.gte('0.70') ? 'GREEN' : 'BREACH',
      action: 'Validation cap until sell-through data exists',
    },
  ];
}

export function getStressResults(state = platformState) {
  const pcr = getPCR(state);
  const marketPolicy = getMarketPolicy(state);
  const loanMetrics = getLoanMetrics(state);
  const hasAFH = state.engineRecords.some((engine) => engine.code === 'AFH');

  return buildStandardScenarios(hasAFH).map((scenario) =>
    runStressScenario(
      {
        protectionSleeve: getSleeveAmount('PROTECTION', state),
        reserveLiquid: getSleeveAmount('RESERVE', state),
        tbillsMaturingBeforeRepayment: pcr.liquidAssets.minus(getSleeveAmount('PROTECTION', state)).minus(getSleeveAmount('RESERVE', state)).minus(5000),
        prepaidRevenueCollected: new Decimal(5000),
        investorPrincipalDue: getInvestorPrincipalDue(state),
        marketAlphaCurrentValue: getSleeveAmount('MARKET_ALPHA', state).plus(getSleeveAmount('LOAN_BOOK', state)),
        marketAlphaCycleStartValue: marketPolicy.currentValues.total.plus(new Decimal(12000)),
        undcProfitExpected: new Decimal(8500),
        afhProfitExpected: new Decimal(2500),
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
            .map((field) => ({ entity: `Engine ${engine.code}`, field, blocking: field === 'sellThrough' || field === 'operationalRisk' }))
        : [],
    ),
    ...state.borrowers
      .filter((borrower) => borrower.idNumber === 'TBC')
      .map((borrower) => ({ entity: `Borrower ${borrower.name}`, field: 'idNumber', blocking: true })),
  ];
}

export function getInvestorStatements(state = platformState) {
  return state.investors.map((investor) => buildInvestorStatement(investor, state.contributions, state.repayments));
}
