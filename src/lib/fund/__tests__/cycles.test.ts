import { describe, expect, it } from 'vitest';
import { Decimal } from '@/lib/finance';
import {
  closeCycle,
  createPlanningCycle,
  nextCycleOpeningRetainedCapital,
  transitionCycle,
} from '../cycles';

describe('fund cycle lifecycle', () => {
  it('opens a planning cycle with retained capital plus investor contributions as opening NAV', () => {
    const cycle = createPlanningCycle({
      id: 'cycle-1',
      sequenceNo: 1,
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      priorRetainedCapital: new Decimal(12000),
      newInvestorContributions: new Decimal(88000),
    });

    expect(cycle.status).toBe('PLANNING');
    expect(cycle.openingNAV?.toFixed(2)).toBe('100000.00');
  });

  it('blocks illegal lifecycle transitions', () => {
    const cycle = createPlanningCycle({
      id: 'cycle-1',
      sequenceNo: 1,
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      priorRetainedCapital: new Decimal(0),
      newInvestorContributions: new Decimal(50000),
    });

    expect(() => transitionCycle(cycle, 'CLOSED')).toThrow('Illegal cycle transition');
  });

  it('closes from CLOSING and computes retained capital after principal repayment', () => {
    const closingCycle = transitionCycle(
      transitionCycle(
        createPlanningCycle({
          id: 'cycle-1',
          sequenceNo: 1,
          startDate: '2026-07-01',
          endDate: '2026-09-30',
          priorRetainedCapital: new Decimal(0),
          newInvestorContributions: new Decimal(100000),
        }),
        'ACTIVE',
      ),
      'CLOSING',
    );

    const closed = closeCycle(closingCycle, new Decimal(118500), new Decimal(100000));

    expect(closed.status).toBe('CLOSED');
    expect(closed.retainedCapital?.toFixed(2)).toBe('18500.00');
    expect(nextCycleOpeningRetainedCapital(closed).toFixed(2)).toBe('18500.00');
  });
});
