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
});
