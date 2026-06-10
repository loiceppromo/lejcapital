import { Decimal } from '@/lib/finance';
import type { Regime } from '@/lib/finance';

export type CycleStatus = 'PLANNING' | 'ACTIVE' | 'CLOSING' | 'CLOSED';

export interface FundCycle {
  id: string;
  sequenceNo: number;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  openingNAV: Decimal | null;
  closingNAV: Decimal | null;
  retainedCapital: Decimal | null;
  regime?: Regime | null;
  notes?: string;
}

export interface CycleOpenInput {
  id: string;
  sequenceNo: number;
  startDate: string;
  endDate: string;
  priorRetainedCapital: Decimal;
  newInvestorContributions: Decimal;
  notes?: string;
}

const allowedTransitions: Record<CycleStatus, CycleStatus[]> = {
  PLANNING: ['ACTIVE'],
  ACTIVE: ['CLOSING'],
  CLOSING: ['CLOSED'],
  CLOSED: [],
};

export function createPlanningCycle(input: CycleOpenInput): FundCycle {
  if (new Date(input.endDate) <= new Date(input.startDate)) {
    throw new Error('Cycle end date must be after start date.');
  }

  return {
    id: input.id,
    sequenceNo: input.sequenceNo,
    startDate: input.startDate,
    endDate: input.endDate,
    status: 'PLANNING',
    openingNAV: input.priorRetainedCapital.plus(input.newInvestorContributions),
    closingNAV: null,
    retainedCapital: null,
    notes: input.notes,
  };
}

export function canTransitionCycle(from: CycleStatus, to: CycleStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function transitionCycle(cycle: FundCycle, nextStatus: CycleStatus): FundCycle {
  if (!canTransitionCycle(cycle.status, nextStatus)) {
    throw new Error(`Illegal cycle transition: ${cycle.status} to ${nextStatus}.`);
  }

  return {
    ...cycle,
    status: nextStatus,
  };
}

export function closeCycle(
  cycle: FundCycle,
  closingNAV: Decimal,
  investorPrincipalRepaid: Decimal,
): FundCycle {
  if (cycle.status !== 'CLOSING') {
    throw new Error('Only a CLOSING cycle can be closed.');
  }

  return {
    ...cycle,
    status: 'CLOSED',
    closingNAV,
    retainedCapital: Decimal.max(closingNAV.minus(investorPrincipalRepaid), 0),
  };
}

export function nextCycleOpeningRetainedCapital(priorCycle: FundCycle | null): Decimal {
  return priorCycle?.retainedCapital ?? new Decimal(0);
}
