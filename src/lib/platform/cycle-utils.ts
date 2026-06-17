import type { PlatformState } from './types';

export const SYNTHETIC_EMPTY_CYCLE_ID = 'empty-cycle';

export function isSyntheticCycleId(cycleId: string | null | undefined): boolean {
  return cycleId === SYNTHETIC_EMPTY_CYCLE_ID;
}

export function getPersistedCycles(state: PlatformState) {
  return state.cycles.filter((cycle) => !isSyntheticCycleId(cycle.id));
}

export function hasPersistedCycles(state: PlatformState): boolean {
  return getPersistedCycles(state).length > 0;
}

export function toCycleOptions(state: PlatformState) {
  return getPersistedCycles(state).map((cycle) => ({
    id: cycle.id,
    label: `Cycle ${cycle.sequenceNo} · ${cycle.status}`,
  }));
}
