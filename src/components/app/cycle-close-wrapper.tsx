'use client';

import { CycleCloseWizard } from './cycle-close-wizard';
import { transitionCycle, setRetainedCapital, createCycle } from '@/app/actions/cycles';

/**
 * Client wrapper for CycleCloseWizard that binds server actions.
 * The server component passes serialisable props; this component
 * injects the actual server action references.
 */
export function CycleCloseWrapper({
  cycleId,
  cycleNo,
  cycleStatus,
  missingDataCount,
  hasWaterfallRun,
  retainedCapital,
  nextSequenceNo,
}: {
  cycleId: string;
  cycleNo: number;
  cycleStatus: string;
  missingDataCount: number;
  hasWaterfallRun: boolean;
  retainedCapital: string | null;
  nextSequenceNo: number;
}) {
  return (
    <CycleCloseWizard
      cycleId={cycleId}
      cycleNo={cycleNo}
      cycleStatus={cycleStatus}
      missingDataCount={missingDataCount}
      hasWaterfallRun={hasWaterfallRun}
      retainedCapital={retainedCapital}
      nextSequenceNo={nextSequenceNo}
      transitionAction={transitionCycle}
      setRetainedAction={setRetainedCapital}
      createCycleAction={createCycle}
    />
  );
}
