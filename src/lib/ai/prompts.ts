import type { PlatformState } from '@/lib/platform/types';
import {
  getActiveCycle,
  getActiveSleeves,
  getInvestorPrincipalDue,
  getLoanMetrics,
  getOverview,
  getPCR,
  getRiskItems,
  getStressResults,
  getLiquidityCliffRadar,
  getWaterfall,
  money,
  pct,
  ratio,
} from '@/lib/platform/selectors';
import { Decimal } from '@/lib/finance';

const SYSTEM_IDENTITY = `You are the LEJ Capital AI Advisor — an intelligent assistant embedded in the LEJ Capital Management platform.
You are an expert in fund management, capital allocation, risk management, and Ghanaian financial markets (GSE, BoG T-Bills, GHS).

Your responsibilities:
1. AUTOMATIC LOGGING — Generate clear, professional audit log narratives when the fund manager performs actions.
2. DECISION ANALYSIS — Analyze current fund metrics and provide calculated recommendations on capital allocation, risk posture, loan approvals, and sleeve rebalancing.
3. RISK ALERTS — Proactively flag risks, breaches, and opportunities based on PCR, PAR, stress tests, and liquidity cliffs.

Formatting rules:
- Use GHS currency (Ghana Cedis) with 2 decimal places.
- Reference specific metrics and thresholds from the fund policy.
- Be concise and actionable. No fluff.
- When recommending decisions, always state the reasoning and the expected impact on PCR and NAV.`;

export function buildSystemPrompt(state: PlatformState): string {
  const cycle = getActiveCycle(state);
  const sleeves = getActiveSleeves(state);
  const overview = getOverview(state);
  const pcr = getPCR(state);
  const loanMetrics = getLoanMetrics(state);
  const riskItems = getRiskItems(state);
  const stress = getStressResults(state);
  const liquidity = getLiquidityCliffRadar(state);
  const waterfall = getWaterfall(state);
  const principalDue = getInvestorPrincipalDue(state);

  const sleeveLines = sleeves.map(
    (s) => `  ${s.type}: funded=${money(s.fundedAmount)}, target=${s.targetAmount ? money(s.targetAmount) : 'TBC'}`,
  );

  const riskLines = riskItems.map(
    (r) => `  ${r.label}: ${r.value} [${r.state}] — ${r.action}`,
  );

  const loanLines = loanMetrics.summaries.slice(0, 10).map(
    (l) => `  ${l.borrower?.name ?? 'Unknown'}: ${money(l.outstandingPrincipal)} outstanding — ${l.status}, ${l.maxDaysPastDue}d overdue`,
  );

  const stressLines = stress.map(
    (s) => `  ${s.label}: PCR after → ${ratio(s.pcr)}, principal covered: ${s.principalCovered ? 'yes' : 'no'}, NAV impact: ${money(s.navImpact)}`,
  );

  const snapshot = `
CURRENT FUND STATE (Cycle ${cycle.sequenceNo}, status: ${cycle.status}):
- Opening NAV: ${money(cycle.openingNAV)}
- Investor principal due: ${money(principalDue)}
- PCR: ${ratio(pcr.pcr)} (status: ${pcr.status}, target: 1.15x–1.25x)
- Risk breaches: ${overview.riskBreaches}
- Total investors: ${state.investors.length}
- Total loans: ${state.loans.length}
- PAR30: ${pct(loanMetrics.par30)} | PAR90: ${pct(loanMetrics.par90)}

SLEEVE ALLOCATIONS:
${sleeveLines.join('\n')}

RISK DASHBOARD:
${riskLines.length > 0 ? riskLines.join('\n') : '  No active risk items.'}

ACTIVE LOANS (top 10):
${loanLines.length > 0 ? loanLines.join('\n') : '  No active loans.'}

STRESS TEST RESULTS:
${stressLines.length > 0 ? stressLines.join('\n') : '  No stress scenarios configured.'}

LIQUIDITY:
- Days until cliff: ${liquidity.daysUntilCliff ?? 'N/A'}
- Liquid assets: ${money(liquidity.liquidAssets)}
- Protected amount: ${money(liquidity.protectedAmount)}
- Available buffer: ${money(liquidity.availableBuffer)}
- Projected outflows: ${money(liquidity.projectedOutflows)}
- Days until cycle end: ${liquidity.daysUntilCycleEnd}
- Status: ${liquidity.status} — ${liquidity.action}

WATERFALL (last run):
${waterfall.length > 0 ? waterfall.map((w) => `  ${w.claimType}: claimed=${money(w.amountClaimed)}`).join('\n') : 'No waterfall run yet.'}
`;

  return SYSTEM_IDENTITY + '\n\n' + snapshot;
}

export function buildAutoLogPrompt(action: string, entityType: string, details: Record<string, unknown>): string {
  return `Generate a concise, professional audit log narrative for this action.

Action: ${action}
Entity: ${entityType}
Details: ${JSON.stringify(details, null, 2)}

Write a single paragraph (2-3 sentences) describing what happened, why it matters, and any immediate implications for the fund. Use professional fund management language. Do not use markdown.`;
}

export function buildDecisionPrompt(question: string): string {
  return `The fund manager is asking for your analysis and recommendation:

"${question}"

Provide a structured response with:
1. ASSESSMENT — Current state analysis relevant to the question
2. RECOMMENDATION — Your specific recommendation with rationale
3. IMPACT — Expected impact on PCR, NAV, and risk posture
4. ACTION ITEMS — Concrete next steps

Be specific with numbers. Reference the fund state data provided in the system context.`;
}
