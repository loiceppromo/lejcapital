/**
 * Proactive capital signals.
 *
 * Derives "what needs attention" from the authoritative live position so the
 * Decision Centre and dashboard can tell the Fund Manager what to do next
 * instead of making them hunt through modules. Pure read over platform state.
 */
import { getOverview, getActiveCycle, ratio, money } from './selectors';
import { platformState } from './seed-data';
import type { PlatformState } from './types';

export type SignalSeverity = 'CRITICAL' | 'ACTION' | 'INFO';

export interface CapitalSignal {
  id: string;
  severity: SignalSeverity;
  title: string;
  detail: string;
  href: string;
  cta: string;
}

const ORDER: Record<SignalSeverity, number> = { CRITICAL: 0, ACTION: 1, INFO: 2 };

export function getCapitalSignals(
  state: PlatformState = platformState,
  opts: { pendingApprovals?: number; asOf?: Date } = {},
): CapitalSignal[] {
  const overview = getOverview(state);
  const activeCycle = getActiveCycle(state);
  const signals: CapitalSignal[] = [];

  // Principal coverage impaired → highest priority.
  if (overview.pcr.status !== 'GREEN' || overview.riskBreaches > 0) {
    signals.push({
      id: 'coverage',
      severity: 'CRITICAL',
      title: 'Restore principal coverage',
      detail: `PCR ${ratio(overview.pcr.pcr)}${overview.riskBreaches > 0 ? ` · ${overview.riskBreaches} active breach${overview.riskBreaches > 1 ? 'es' : ''}` : ''}. Deployment of risk capital is restricted.`,
      href: '/risk',
      cta: 'Review risk',
    });
  }

  // Recommendations awaiting approval.
  const pending = opts.pendingApprovals ?? 0;
  if (pending > 0) {
    signals.push({
      id: 'approvals',
      severity: 'ACTION',
      title: 'Approve capital allocation',
      detail: `${pending} recommendation${pending > 1 ? 's' : ''} awaiting your approval.`,
      href: '/decisions',
      cta: 'Review',
    });
  }

  // Idle / available liquidity that could be put to work.
  const cash = overview.marketPolicy.currentValues.cash;
  if (cash.gt(0)) {
    signals.push({
      id: 'idle-cash',
      severity: 'ACTION',
      title: 'Allocate available capital',
      detail: `${money(cash)} is liquid and available to deploy.`,
      href: '/decisions',
      cta: 'Analyse',
    });
  }

  // Treasury Bills approaching maturity (a redeployment decision is coming).
  const asOf = opts.asOf ?? new Date();
  for (const h of state.marketHoldings.filter((m) => m.cycleId === activeCycle.id && m.instrumentType === 'TBILL' && m.maturityDate)) {
    const days = Math.ceil((new Date(h.maturityDate!).getTime() - asOf.getTime()) / (24 * 60 * 60 * 1000));
    if (days < 0) {
      signals.push({
        id: `maturity-${h.id}`,
        severity: 'ACTION',
        title: 'Redeploy matured Treasury Bill',
        detail: `${h.name} matured ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago. Confirm the cash receipt and choose its next allocation.`,
        href: '/decisions',
        cta: 'Analyse',
      });
    } else if (days <= 30) {
      signals.push({
        id: `maturity-${h.id}`,
        severity: 'INFO',
        title: 'Upcoming maturity',
        detail: `${h.name} matures in ${days} day${days === 1 ? '' : 's'} — capital will need redeployment.`,
        href: '/market',
        cta: 'View',
      });
    }
  }

  signals.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  return signals;
}

/** The single most important next action (for the dashboard hero). */
export function getRecommendedAction(
  state: PlatformState = platformState,
  opts: { pendingApprovals?: number; asOf?: Date } = {},
): CapitalSignal {
  const signals = getCapitalSignals(state, opts);
  return (
    signals[0] ?? {
      id: 'all-clear',
      severity: 'INFO',
      title: 'No action required',
      detail: 'Capital is allocated and principal coverage is within target.',
      href: '/decisions',
      cta: 'Open Decision Centre',
    }
  );
}
