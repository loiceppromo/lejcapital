'use client';

import { useState, useTransition } from 'react';
import { StatusBadge } from '@/components/app/status-badge';
import { useToast } from '@/components/app/toast';

/**
 * Cycle Close Wizard — multi-step guided workflow for closing a fund cycle.
 *
 * Steps:
 *  1. Pre-close checklist (verify all data, no missing fields)
 *  2. Freeze cycle (transition ACTIVE → CLOSING)
 *  3. Run waterfall (distribute cash via priority waterfall)
 *  4. Record retained capital and carry-forward
 *  5. Close cycle (transition CLOSING → CLOSED)
 *  6. Open next cycle (optional)
 */

interface CycleCloseWizardProps {
  cycleId: string;
  cycleNo: number;
  cycleStatus: string;
  missingDataCount: number;
  hasWaterfallRun: boolean;
  retainedCapital: string | null;
  nextSequenceNo: number;
  transitionAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  setRetainedAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  createCycleAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}

type Step = 'checklist' | 'freeze' | 'waterfall' | 'retained' | 'close' | 'next-cycle';

const STEPS: { key: Step; label: string; description: string }[] = [
  { key: 'checklist', label: 'Pre-close checklist', description: 'Verify all data is complete.' },
  { key: 'freeze', label: 'Freeze cycle', description: 'Transition to CLOSING status.' },
  { key: 'waterfall', label: 'Run waterfall', description: 'Distribute available cash.' },
  { key: 'retained', label: 'Retained capital', description: 'Record carry-forward amount.' },
  { key: 'close', label: 'Close cycle', description: 'Mark cycle as CLOSED.' },
  { key: 'next-cycle', label: 'Open next cycle', description: 'Create the next cycle.' },
];

function getInitialStep(cycleStatus: string, hasWaterfall: boolean, retainedCapital: string | null): number {
  if (cycleStatus === 'ACTIVE') return 0;
  if (cycleStatus === 'CLOSING') {
    if (!hasWaterfall) return 2;
    if (!retainedCapital) return 3;
    return 4;
  }
  if (cycleStatus === 'CLOSED') return 5;
  return 0;
}

export function CycleCloseWizard({
  cycleId,
  cycleNo,
  cycleStatus,
  missingDataCount,
  hasWaterfallRun,
  retainedCapital,
  nextSequenceNo,
  transitionAction,
  setRetainedAction,
  createCycleAction,
}: CycleCloseWizardProps) {
  const initialStep = getInitialStep(cycleStatus, hasWaterfallRun, retainedCapital);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set(
    Array.from({ length: initialStep }, (_, i) => i),
  ));
  const [isPending, startTransition] = useTransition();
  const pushToast = useToast();

  // Local form state
  const [retainedInput, setRetainedInput] = useState(retainedCapital ?? '');
  const [nextStartDate, setNextStartDate] = useState('');
  const [nextEndDate, setNextEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  function markComplete(stepIndex: number) {
    setCompletedSteps((prev) => new Set([...prev, stepIndex]));
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
    setError(null);
  }

  async function handleFreeze() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('cycleId', cycleId);
      fd.set('newStatus', 'CLOSING');
      const result = await transitionAction(fd);
      if (result.ok) {
        pushToast({ title: `Cycle ${cycleNo} frozen (CLOSING)`, tone: 'success' });
        markComplete(1);
      } else {
        setError(result.error ?? 'Failed to freeze cycle');
      }
    });
  }

  async function handleSetRetained() {
    if (!retainedInput || parseFloat(retainedInput) < 0) {
      setError('Enter a valid retained capital amount.');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set('cycleId', cycleId);
      fd.set('retainedCapital', retainedInput);
      const result = await setRetainedAction(fd);
      if (result.ok) {
        pushToast({ title: 'Retained capital recorded', tone: 'success' });
        markComplete(3);
      } else {
        setError(result.error ?? 'Failed to set retained capital');
      }
    });
  }

  async function handleClose() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('cycleId', cycleId);
      fd.set('newStatus', 'CLOSED');
      const result = await transitionAction(fd);
      if (result.ok) {
        pushToast({ title: `Cycle ${cycleNo} closed`, tone: 'success' });
        markComplete(4);
      } else {
        setError(result.error ?? 'Failed to close cycle');
      }
    });
  }

  async function handleCreateNext() {
    if (!nextStartDate || !nextEndDate) {
      setError('Start and end dates are required for the new cycle.');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set('sequenceNo', String(nextSequenceNo));
      fd.set('startDate', nextStartDate);
      fd.set('endDate', nextEndDate);
      const result = await createCycleAction(fd);
      if (result.ok) {
        pushToast({ title: `Cycle ${nextSequenceNo} created`, tone: 'success' });
        markComplete(5);
      } else {
        setError(result.error ?? 'Failed to create next cycle');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const isComplete = completedSteps.has(i);
          const isCurrent = i === currentStep;
          return (
            <button
              key={step.key}
              onClick={() => (isComplete || isCurrent) && setCurrentStep(i)}
              disabled={!isComplete && !isCurrent}
              className={`flex min-w-0 shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isComplete
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-200 hover:bg-green-100'
                  : isCurrent
                    ? 'bg-brand-navy text-white'
                    : 'bg-brand-panel text-brand-muted ring-1 ring-brand-line'
              }`}
            >
              {isComplete ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/10 text-[10px] font-bold">{i + 1}</span>
              )}
              <span className="truncate">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="rounded-lg border border-brand-line bg-white p-5">
        <h3 className="text-sm font-semibold text-brand-black">{STEPS[currentStep].label}</h3>
        <p className="mt-1 text-xs text-brand-muted">{STEPS[currentStep].description}</p>
        <div className="mt-4">

          {/* Step 0: Checklist */}
          {currentStep === 0 && (
            <div className="space-y-3">
              <ChecklistItem
                label="No missing data fields"
                ok={missingDataCount === 0}
                detail={missingDataCount === 0 ? 'All fields complete' : `${missingDataCount} field(s) still missing`}
              />
              <ChecklistItem
                label="Cycle is ACTIVE"
                ok={cycleStatus === 'ACTIVE'}
                detail={`Current status: ${cycleStatus}`}
              />
              <ChecklistItem
                label="At least one investor contribution"
                ok={true}
                detail="Verified"
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => markComplete(0)}
                  disabled={missingDataCount > 0 || cycleStatus !== 'ACTIVE'}
                  className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue to freeze
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Freeze */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-brand-charcoal">
                Freezing the cycle moves it from <StatusBadge state="GREEN">ACTIVE</StatusBadge> to <StatusBadge state="WATCH">CLOSING</StatusBadge>.
                No new allocations or contributions can be made once frozen.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setCurrentStep(0)} className="rounded-md border border-brand-line px-3 py-2 text-sm font-semibold text-brand-charcoal hover:bg-brand-panel">
                  Back
                </button>
                <button
                  onClick={handleFreeze}
                  disabled={isPending}
                  className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50"
                >
                  {isPending ? 'Freezing...' : `Freeze Cycle ${cycleNo}`}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Waterfall */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-brand-charcoal">
                Run the waterfall distribution to allocate available cash by priority order.
                Use the &ldquo;Run waterfall&rdquo; drawer on the Cycles page to enter claim amounts.
              </p>
              {hasWaterfallRun ? (
                <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Waterfall has been run for this cycle.
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  No waterfall run recorded yet. Run the waterfall before continuing.
                </div>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setCurrentStep(1)} className="rounded-md border border-brand-line px-3 py-2 text-sm font-semibold text-brand-charcoal hover:bg-brand-panel">
                  Back
                </button>
                <button
                  onClick={() => markComplete(2)}
                  disabled={!hasWaterfallRun}
                  className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Retained capital */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-brand-charcoal">
                Enter the retained capital amount that will carry forward to the next cycle.
                This becomes the starting NAV base for the next cycle.
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-charcoal">
                  Retained capital (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={retainedInput}
                  onChange={(e) => setRetainedInput(e.target.value)}
                  className="w-full rounded-md border border-brand-line px-3 py-2 text-sm"
                  placeholder="e.g. 85000.00"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setCurrentStep(2)} className="rounded-md border border-brand-line px-3 py-2 text-sm font-semibold text-brand-charcoal hover:bg-brand-panel">
                  Back
                </button>
                <button
                  onClick={handleSetRetained}
                  disabled={isPending}
                  className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save retained capital'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Close */}
          {currentStep === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-brand-charcoal">
                Close the cycle permanently. This transitions <StatusBadge state="WATCH">CLOSING</StatusBadge> to <StatusBadge state="NEUTRAL">CLOSED</StatusBadge>.
                Once closed, no modifications can be made to this cycle.
              </p>
              <div className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                This action is irreversible.
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setCurrentStep(3)} className="rounded-md border border-brand-line px-3 py-2 text-sm font-semibold text-brand-charcoal hover:bg-brand-panel">
                  Back
                </button>
                <button
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? 'Closing...' : `Close Cycle ${cycleNo}`}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Open next cycle */}
          {currentStep === 5 && (
            <div className="space-y-3">
              <p className="text-sm text-brand-charcoal">
                Optionally create Cycle {nextSequenceNo} to continue operations.
                The retained capital from Cycle {cycleNo} will be the opening NAV.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-charcoal">Start date</label>
                  <input
                    type="date"
                    value={nextStartDate}
                    onChange={(e) => setNextStartDate(e.target.value)}
                    className="w-full rounded-md border border-brand-line px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-charcoal">End date</label>
                  <input
                    type="date"
                    value={nextEndDate}
                    onChange={(e) => setNextEndDate(e.target.value)}
                    className="w-full rounded-md border border-brand-line px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setCurrentStep(4)} className="rounded-md border border-brand-line px-3 py-2 text-sm font-semibold text-brand-charcoal hover:bg-brand-panel">
                  Back
                </button>
                <button
                  onClick={handleCreateNext}
                  disabled={isPending}
                  className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy-dark disabled:opacity-50"
                >
                  {isPending ? 'Creating...' : `Create Cycle ${nextSequenceNo}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${ok ? 'bg-green-50' : 'bg-red-50'}`}>
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}>
        {ok ? (
          <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${ok ? 'text-green-800' : 'text-red-800'}`}>{label}</p>
        <p className={`text-xs ${ok ? 'text-green-600' : 'text-red-600'}`}>{detail}</p>
      </div>
    </div>
  );
}
