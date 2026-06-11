/**
 * Tests for the cycle lifecycle: creation, transitions, closing, retained capital carry-forward.
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '@/lib/finance';
import {
  createPlanningCycle,
  canTransitionCycle,
  transitionCycle,
  closeCycle,
  nextCycleOpeningRetainedCapital,
  type FundCycle,
} from '@/lib/fund/cycles';

function makeCycle(overrides: Partial<FundCycle> = {}): FundCycle {
  return {
    id: 'cycle-1',
    sequenceNo: 1,
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    status: 'ACTIVE',
    openingNAV: new Decimal('100000'),
    closingNAV: null,
    retainedCapital: null,
    ...overrides,
  };
}

describe('createPlanningCycle', () => {
  it('creates a PLANNING cycle with computed opening NAV', () => {
    const cycle = createPlanningCycle({
      id: 'c-1',
      sequenceNo: 2,
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      priorRetainedCapital: new Decimal('50000'),
      newInvestorContributions: new Decimal('30000'),
    });

    expect(cycle.status).toBe('PLANNING');
    expect(cycle.openingNAV!.toNumber()).toBe(80000);
    expect(cycle.closingNAV).toBeNull();
    expect(cycle.retainedCapital).toBeNull();
  });

  it('throws if end date is before start date', () => {
    expect(() =>
      createPlanningCycle({
        id: 'c-1',
        sequenceNo: 1,
        startDate: '2026-12-31',
        endDate: '2026-01-01',
        priorRetainedCapital: new Decimal(0),
        newInvestorContributions: new Decimal(0),
      }),
    ).toThrow('end date must be after start date');
  });

  it('throws if end date equals start date', () => {
    expect(() =>
      createPlanningCycle({
        id: 'c-1',
        sequenceNo: 1,
        startDate: '2026-06-01',
        endDate: '2026-06-01',
        priorRetainedCapital: new Decimal(0),
        newInvestorContributions: new Decimal(0),
      }),
    ).toThrow('end date must be after start date');
  });
});

describe('canTransitionCycle', () => {
  it.each([
    ['PLANNING', 'ACTIVE', true],
    ['ACTIVE', 'CLOSING', true],
    ['CLOSING', 'CLOSED', true],
    ['PLANNING', 'CLOSING', false],
    ['PLANNING', 'CLOSED', false],
    ['ACTIVE', 'PLANNING', false],
    ['ACTIVE', 'CLOSED', false],
    ['CLOSING', 'ACTIVE', false],
    ['CLOSED', 'PLANNING', false],
    ['CLOSED', 'ACTIVE', false],
    ['CLOSED', 'CLOSING', false],
  ] as const)('%s → %s = %s', (from, to, expected) => {
    expect(canTransitionCycle(from, to)).toBe(expected);
  });
});

describe('transitionCycle', () => {
  it('transitions PLANNING → ACTIVE', () => {
    const cycle = makeCycle({ status: 'PLANNING' });
    const result = transitionCycle(cycle, 'ACTIVE');
    expect(result.status).toBe('ACTIVE');
    expect(result.id).toBe(cycle.id);
  });

  it('transitions ACTIVE → CLOSING', () => {
    const result = transitionCycle(makeCycle({ status: 'ACTIVE' }), 'CLOSING');
    expect(result.status).toBe('CLOSING');
  });

  it('throws on illegal transition ACTIVE → CLOSED', () => {
    expect(() => transitionCycle(makeCycle({ status: 'ACTIVE' }), 'CLOSED')).toThrow(
      'Illegal cycle transition',
    );
  });

  it('throws on backward transition CLOSING → ACTIVE', () => {
    expect(() => transitionCycle(makeCycle({ status: 'CLOSING' }), 'ACTIVE')).toThrow(
      'Illegal cycle transition',
    );
  });

  it('preserves all other fields', () => {
    const cycle = makeCycle({
      status: 'PLANNING',
      openingNAV: new Decimal('250000'),
      notes: 'test note',
    });
    const result = transitionCycle(cycle, 'ACTIVE');
    expect(result.openingNAV!.toNumber()).toBe(250000);
    expect(result.notes).toBe('test note');
  });
});

describe('closeCycle', () => {
  it('closes a CLOSING cycle and computes retained capital', () => {
    const cycle = makeCycle({ status: 'CLOSING' });
    const result = closeCycle(cycle, new Decimal('120000'), new Decimal('80000'));
    expect(result.status).toBe('CLOSED');
    expect(result.closingNAV!.toNumber()).toBe(120000);
    expect(result.retainedCapital!.toNumber()).toBe(40000); // 120k - 80k
  });

  it('retained capital cannot be negative', () => {
    const cycle = makeCycle({ status: 'CLOSING' });
    const result = closeCycle(cycle, new Decimal('50000'), new Decimal('80000'));
    expect(result.retainedCapital!.toNumber()).toBe(0); // Max(50k - 80k, 0) = 0
  });

  it('throws if cycle is not CLOSING', () => {
    expect(() =>
      closeCycle(makeCycle({ status: 'ACTIVE' }), new Decimal('100000'), new Decimal('50000')),
    ).toThrow('Only a CLOSING cycle can be closed');
  });
});

describe('nextCycleOpeningRetainedCapital', () => {
  it('returns retained capital from prior cycle', () => {
    const prior = makeCycle({ retainedCapital: new Decimal('35000') });
    expect(nextCycleOpeningRetainedCapital(prior).toNumber()).toBe(35000);
  });

  it('returns zero when no prior cycle', () => {
    expect(nextCycleOpeningRetainedCapital(null).toNumber()).toBe(0);
  });

  it('returns zero when prior cycle has null retained capital', () => {
    const prior = makeCycle({ retainedCapital: null });
    expect(nextCycleOpeningRetainedCapital(prior).toNumber()).toBe(0);
  });
});
