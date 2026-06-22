import { describe, it, expect } from 'vitest';
import { getCapitalSignals, getRecommendedAction } from '../signals';
import { platformState } from '../seed-data';

describe('capital signals', () => {
  it('surfaces pending approvals as an action signal', () => {
    const signals = getCapitalSignals(platformState, { pendingApprovals: 2 });
    const approvals = signals.find((s) => s.id === 'approvals');
    expect(approvals).toBeTruthy();
    expect(approvals!.detail).toMatch(/2 recommendations/);
    expect(approvals!.href).toBe('/decisions');
  });

  it('orders CRITICAL before ACTION before INFO', () => {
    const signals = getCapitalSignals(platformState, { pendingApprovals: 1 });
    for (let i = 1; i < signals.length; i++) {
      const rank = { CRITICAL: 0, ACTION: 1, INFO: 2 } as const;
      expect(rank[signals[i].severity]).toBeGreaterThanOrEqual(rank[signals[i - 1].severity]);
    }
  });

  it('always returns a recommended action (never throws)', () => {
    const action = getRecommendedAction(platformState, { pendingApprovals: 0 });
    expect(action.title).toBeTruthy();
    expect(action.href).toBeTruthy();
  });

  it('uses the current date, not the cycle start, for T-Bill maturity signals', () => {
    const state = {
      ...platformState,
      marketHoldings: [{
      id: 'tbill-near-maturity', cycleId: platformState.activeCycleId, instrumentType: 'TBILL' as const, name: '91-day T-Bill',
      amountInvested: platformState.sleevesByCycle[platformState.activeCycleId][0].fundedAmount,
      currentValue: platformState.sleevesByCycle[platformState.activeCycleId][0].fundedAmount,
      returnRate: null, purchaseDate: '2026-01-01', maturityDate: '2026-06-25',
      }],
    };
    const signals = getCapitalSignals(state, { asOf: new Date('2026-06-22T12:00:00Z') });
    expect(signals.find((signal) => signal.id === 'maturity-tbill-near-maturity')?.detail).toContain('3 days');
  });
});
