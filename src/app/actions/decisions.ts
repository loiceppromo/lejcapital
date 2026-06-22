'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission, getCurrentUser } from '@/lib/auth/server';
import { loadPlatformState } from '@/lib/data/queries';
import { recommendForAvailableCapital } from '@/lib/platform/allocation';
import type { AllocationRecommendation, StrategyKey } from '@/lib/finance/capital-allocation';
import { writeAuditLog } from './audit';
import { parsePositiveMoneyInput } from '@/lib/server/financial-inputs';

export interface DecisionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const json = <T,>(v: T) => JSON.parse(JSON.stringify(v));

/**
 * Workflow B — analyse available capital and generate a ranked recommendation.
 * Persists the full analytical record (status PENDING). Recommends only.
 */
export async function generateRecommendation(availableCapital: number): Promise<DecisionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('ADD_LEDGER_ENTRY');
  if (!Number.isFinite(availableCapital) || availableCapital <= 0) {
    return { ok: false, error: 'Enter a positive amount of available capital to analyse.' };
  }
  try {
    const state = await loadPlatformState();
    const rec: AllocationRecommendation = recommendForAvailableCapital(availableCapital, state);
    const db = await getDb();
    const decision = await db.allocationDecision.create({
      data: {
        availableCapital: availableCapital.toFixed(2),
        status: 'PENDING',
        restricted: rec.restricted,
        confidence: rec.confidence.toFixed(4),
        recommendation: json(rec),
      },
    });
    await writeAuditLog('GENERATE_ALLOCATION_RECOMMENDATION', 'AllocationDecision', decision.id as string, {
      availableCapital, restricted: rec.restricted, recommended: rec.strategies[0]?.name,
    });
    revalidatePath('/decisions');
    revalidatePath('/dashboard');
    return { ok: true, id: decision.id as string };
  } catch (err) {
    console.error('[generateRecommendation] failed:', err);
    return { ok: false, error: 'Could not generate a recommendation. Review the system logs and try again.' };
  }
}

/**
 * Approve a recommendation (or a modified allocation). Marks the decision
 * "APPROVED — awaiting manual execution". The system never executes.
 */
export async function approveDecision(
  decisionId: string,
  strategyKey: StrategyKey | 'MODIFIED',
  opts?: { modifiedAllocation?: unknown; modificationReason?: string; riskOverride?: boolean },
): Promise<DecisionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('MANAGE_SETTINGS');
  try {
    const db = await getDb();
    const decision = await db.allocationDecision.findUnique({ where: { id: decisionId } });
    if (!decision) return { ok: false, error: 'Decision not found.' };
    if (decision.status !== 'PENDING' && decision.status !== 'DRAFT') {
      return { ok: false, error: `Decision is already ${String(decision.status).toLowerCase()}.` };
    }
    const rec = decision.recommendation as unknown as AllocationRecommendation;
    const chosen = strategyKey === 'MODIFIED' ? null : rec.strategies.find((s) => s.key === strategyKey);
    if (strategyKey !== 'MODIFIED') {
      if (!chosen) return { ok: false, error: 'Strategy not found in recommendation.' };
      if (!chosen.eligible && !opts?.riskOverride) {
        return { ok: false, error: 'This strategy is not eligible under current risk controls. An authorised risk override and justification are required.' };
      }
    }
    if (opts?.riskOverride && !opts?.modificationReason) {
      return { ok: false, error: 'A justification is required to override a risk control.' };
    }
    const user = await getCurrentUser();
    await db.allocationDecision.update({
      where: { id: decisionId },
      data: {
        status: 'APPROVED',
        approvedStrategy: strategyKey,
        approvedAllocation: json(strategyKey === 'MODIFIED' ? opts?.modifiedAllocation ?? null : chosen?.lines ?? null),
        modificationReason: opts?.modificationReason ?? null,
        riskOverride: opts?.riskOverride ?? false,
        approvedBy: user.email ?? user.id ?? 'unknown',
        approvedAt: new Date(),
      },
    });
    await writeAuditLog('APPROVE_ALLOCATION', 'AllocationDecision', decisionId, {
      strategyKey, riskOverride: opts?.riskOverride ?? false, modificationReason: opts?.modificationReason ?? null,
      approvedBy: user.email ?? user.id,
    });
    revalidatePath('/decisions');
    revalidatePath('/dashboard');
    return { ok: true, id: decisionId };
  } catch (err) {
    console.error('[approveDecision] failed:', err);
    return { ok: false, error: 'Could not record the approval. Review the system logs and try again.' };
  }
}

export async function rejectDecision(decisionId: string, reason?: string): Promise<DecisionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('MANAGE_SETTINGS');
  try {
    const db = await getDb();
    await db.allocationDecision.update({ where: { id: decisionId }, data: { status: 'REJECTED', modificationReason: reason ?? null } });
    await writeAuditLog('REJECT_ALLOCATION', 'AllocationDecision', decisionId, { reason: reason ?? null });
    revalidatePath('/decisions');
    return { ok: true, id: decisionId };
  } catch (err) {
    console.error('[rejectDecision] failed:', err);
    return { ok: false, error: 'Could not record the rejection. Review the system logs and try again.' };
  }
}

/** Record manual execution + actual outcome for performance tracking. */
export async function recordExecution(decisionId: string, actualOutcome: unknown): Promise<DecisionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('MANAGE_SETTINGS');
  try {
    const db = await getDb();
    const decision = await db.allocationDecision.findUnique({ where: { id: decisionId } });
    if (!decision) return { ok: false, error: 'Decision not found.' };
    if (decision.status === 'EXECUTED') return { ok: false, error: 'This decision has already been executed and is immutable.' };
    if (decision.status !== 'APPROVED') return { ok: false, error: 'Only an approved decision can be recorded as executed.' };

    const input = actualOutcome as { actualAmount?: unknown; executedOn?: unknown; notes?: unknown };
    const actualAmount = parsePositiveMoneyInput(String(input?.actualAmount ?? ''), 'Actual deployed amount');
    const executedOn = String(input?.executedOn ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(executedOn) || Number.isNaN(new Date(`${executedOn}T12:00:00Z`).getTime())) {
      return { ok: false, error: 'Execution date must be a valid YYYY-MM-DD date.' };
    }
    const notes = String(input?.notes ?? '').trim();
    if (!notes) return { ok: false, error: 'Add a short execution note for the audit record.' };

    const approvedAllocation = decision.approvedAllocation as unknown;
    await db.allocationDecision.update({
      where: { id: decisionId },
      data: {
        status: 'EXECUTED',
        actualOutcome: json({ actualAmount, executedOn, notes, approvedAllocation }),
        executedAt: new Date(),
      },
    });
    await writeAuditLog('EXECUTE_ALLOCATION', 'AllocationDecision', decisionId, {
      approvedStrategy: decision.approvedStrategy,
      actualAmount,
      executedOn,
      notes,
      recordedAt: new Date().toISOString(),
    });
    revalidatePath('/decisions');
    revalidatePath('/dashboard');
    revalidatePath('/ledger');
    return { ok: true, id: decisionId };
  } catch (err) {
    console.error('[recordExecution] failed:', err);
    return { ok: false, error: 'Could not record execution. Review the system logs and try again.' };
  }
}
