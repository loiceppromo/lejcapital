import { describe, expect, it } from 'vitest';
import { Decimal } from '@/lib/finance';
import { getOverview, getUnallocatedOpeningCapital } from '../selectors';
import { platformState } from '../seed-data';

describe('opening NAV treatment', () => {
  it('includes unallocated active-cycle opening NAV as cash exactly once', () => {
    const cycleId = platformState.activeCycleId;
    const state = {
      ...platformState,
      cycles: platformState.cycles.map((cycle) => cycle.id === cycleId ? { ...cycle, openingNAV: new Decimal(10000) } : cycle),
      sleevesByCycle: { ...platformState.sleevesByCycle, [cycleId]: [] },
      marketHoldings: [],
      loans: [],
      loanSchedules: [],
      loanRepayments: [],
    };

    expect(getUnallocatedOpeningCapital(state).toFixed(2)).toBe('10000.00');
    expect(getOverview(state).currentNAV.toFixed(2)).toBe('10000.00');
  });

  it('calculates the cycle capital position as opening capital plus cash in minus cash out', () => {
    const cycleId = platformState.activeCycleId;
    const state = {
      ...platformState,
      cycles: platformState.cycles.map((cycle) => cycle.id === cycleId ? { ...cycle, openingNAV: new Decimal(10000) } : cycle),
      ledgerEntries: [
        { id: 'in', cycleId, date: '2026-07-02', account: 'Businesses', description: 'Income', direction: 'IN' as const, amount: new Decimal(2500), source: 'Manual' },
        { id: 'out', cycleId, date: '2026-07-03', account: 'Stocks', description: 'Purchase', direction: 'OUT' as const, amount: new Decimal(1800), source: 'Manual' },
      ],
    };

    const overview = getOverview(state);
    expect(overview.netMovement.toFixed(2)).toBe('700.00');
    expect(overview.cycleCapitalPosition.toFixed(2)).toBe('10700.00');
  });
});
