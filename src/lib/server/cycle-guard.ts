import { isSyntheticCycleId } from '@/lib/platform/cycle-utils';

export function assertWritableCycleId(cycleId: string | null | undefined): asserts cycleId is string {
  if (!cycleId || isSyntheticCycleId(cycleId)) {
    throw new Error('Create a real cycle first. The empty planning cycle is only a dashboard placeholder.');
  }
}
