import type { PlatformState } from '@/lib/platform/types';
import {
  getActiveCycle,
  getLoanMetrics,
  getLiquidityCliffRadar,
  getMarketPolicy,
  getOverview,
  getRiskItems,
  money,
  pct,
  ratio,
} from '@/lib/platform/selectors';

function bullet(lines: string[]) {
  return lines.map((line) => `- ${line}`).join('\n');
}

function setupNotice(state: PlatformState): string[] {
  const cycle = getActiveCycle(state);
  const realCycleExists = cycle.id !== 'empty-cycle';
  if (realCycleExists) return [];
  return [
    'Create Cycle 1 in Cycles before entering partner capital, loans, market trades, or ledger entries.',
    'The current zero-value planning cycle is a safe placeholder, not a writable financial cycle.',
  ];
}

export function buildLocalAdvisorReply(state: PlatformState, userMessage: string): string {
  const question = userMessage.toLowerCase();
  const cycle = getActiveCycle(state);
  const overview = getOverview(state);
  const loans = getLoanMetrics(state);
  const liquidity = getLiquidityCliffRadar(state);
  const market = getMarketPolicy(state);
  const risks = getRiskItems(state);
  const urgentRisks = risks.filter((risk) => risk.state === 'BREACH' || risk.state === 'WATCH').slice(0, 5);
  const setup = setupNotice(state);

  if (question.includes('loan')) {
    return `Local advisor mode — loan book review\n\n${bullet([
      ...setup,
      `Total outstanding loan principal is ${money(loans.totalOutstanding)} and net recoverable loan value is ${money(loans.netValue)} after provisions.`,
      `PAR > 30 is ${pct(loans.par30)} and PAR > 90 is ${pct(loans.par90)}. Default rate is ${pct(loans.defaultRate)}.`,
      loans.totalOutstanding.isZero()
        ? 'No active loan exposure is recorded yet. Add borrowers, create a real cycle, then originate loans from the loan-book deployment.'
        : 'Before approving any new loan, compare its expected interest against the T-Bill alternative, PCR impact, PAR concentration, and repayment date liquidity.',
      'Outstanding loan principal remains illiquid and must stay excluded from PCR liquid assets.',
    ])}`;
  }

  if (question.includes('pcr') || question.includes('liquid') || question.includes('runway')) {
    return `Local advisor mode — liquidity and PCR\n\n${bullet([
      ...setup,
      `PCR is ${ratio(overview.pcr.pcr)} with status ${overview.pcr.status}. Target operating band is 1.15x to 1.25x.`,
      `Liquid assets are ${money(liquidity.liquidAssets)} against projected outflows of ${money(liquidity.projectedOutflows)}.`,
      `Liquidity status is ${liquidity.status}: ${liquidity.action}`,
      overview.pcr.pcr.lt(1)
        ? 'Protection mode should be active: halt new operating, market, and loan deployment until PCR is restored.'
        : overview.pcr.pcr.lt(1.15)
          ? 'Stay defensive: route available cash toward Protection and avoid new illiquid deployment.'
          : 'PCR is not currently in breach, but new loans and GSE buys should still be checked against cycle-end repayment timing.',
    ])}`;
  }

  if (question.includes('market') || question.includes('trade') || question.includes('rebalance')) {
    return `Local advisor mode — market posture\n\n${bullet([
      ...setup,
      `Effective regime is ${market.effectiveRegime}; requested regime is ${market.requestedRegime}.`,
      `GSE exposure is ${pct(market.gseExposure.currentPct)} against the active ceiling of ${money(market.gseExposure.ceiling)}.`,
      `Market drawdown is ${pct(market.drawdown.drawdownPct)} with status ${market.drawdown.status}.`,
      market.actions.length > 0
        ? `Required market actions: ${market.actions.join(' ')}`
        : 'No market policy breach is currently flagged by the deterministic policy engine.',
    ])}`;
  }

  return `Local advisor mode — morning briefing\n\n${bullet([
    ...setup,
    `Cycle ${cycle.sequenceNo} is ${cycle.status}. Opening NAV is ${money(cycle.openingNAV)}.`,
    `Current NAV is ${money(overview.currentNAV)} and PCR is ${ratio(overview.pcr.pcr)} (${overview.pcr.status}).`,
    `Investor principal due is ${money(overview.investorPrincipalDue)}. Liquid protection must be sized before alpha deployment.`,
    `Loan book net value is ${money(loans.netValue)}. PAR > 30 is ${pct(loans.par30)} and PAR > 90 is ${pct(loans.par90)}.`,
    urgentRisks.length > 0
      ? `Top risk items: ${urgentRisks.map((risk) => `${risk.label} ${risk.value} (${risk.state})`).join('; ')}.`
      : 'No watch or breach items are currently flagged.',
    'Recommended next step: complete Cycle 1 setup, then enter capital movements through the ledger-backed workflows so reports and audits reconcile cleanly.',
  ])}`;
}

export function isQuotaLikeError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const maybe = err as { status?: unknown; code?: unknown; message?: unknown };
  const message = typeof maybe.message === 'string' ? maybe.message.toLowerCase() : '';
  return maybe.status === 429 || String(maybe.code ?? '').includes('quota') || message.includes('quota') || message.includes('rate limit');
}
