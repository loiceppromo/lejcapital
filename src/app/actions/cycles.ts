'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { parseMoneyInput, parseOptionalMoneyInput } from '@/lib/server/financial-inputs';
import { assertWritableCycleId } from '@/lib/server/cycle-guard';
import { notifyCycleTransition } from '@/lib/notifications/service';
import { Decimal, validateRetainedCapitalRule } from '@/lib/finance';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';
import { CycleStatus, SleeveType } from '@/generated/prisma/client';

function parseCycleStatus(value: FormDataEntryValue | null): CycleStatus | null {
  const status = String(value ?? '');
  return Object.values(CycleStatus).includes(status as CycleStatus) ? status as CycleStatus : null;
}

export async function createCycle(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('CREATE_CYCLE');

  const sequenceNo = formData.get('sequenceNo') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const openingNAV = formData.get('openingNAV') as string;

  if (!sequenceNo || !startDate || !endDate) {
    return { ok: false, error: 'Sequence number, start date, and end date are required.' };
  }

  try {
    const db = await getDb();
    const parsedSequenceNo = parseInt(sequenceNo, 10);
    if (Number.isNaN(parsedSequenceNo)) {
      return { ok: false, error: 'Sequence number must be valid.' };
    }
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime()) || parsedEnd <= parsedStart) {
      return { ok: false, error: 'Cycle dates are invalid.' };
    }

    const priorCycle = await db.cycle.findFirst({
      where: { sequenceNo: { lt: parsedSequenceNo }, status: 'CLOSED' },
      orderBy: { sequenceNo: 'desc' },
    });
    const priorRetained = priorCycle?.retainedCapital ? new Decimal(String(priorCycle.retainedCapital)) : new Decimal(0);
    const parsedOpeningNAV = openingNAV
      ? parseOptionalMoneyInput(openingNAV, 'Opening NAV')
      : priorCycle
        ? priorRetained.toFixed(2)
        : null;

    const cycle = await db.cycle.create({
      data: {
        sequenceNo: parsedSequenceNo,
        startDate: parsedStart,
        endDate: parsedEnd,
        openingNAV: parsedOpeningNAV,
        status: 'PLANNING',
      },
    });
    await writeAuditLog('CREATE_CYCLE', 'Cycle', cycle.id as string, {
      sequenceNo: parsedSequenceNo,
      startDate,
      endDate,
      openingNAV: parsedOpeningNAV,
      priorRetained: priorRetained.toFixed(2),
    });
    revalidatePath('/cycles');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function transitionCycle(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('TRANSITION_CYCLE');

  const cycleId = formData.get('cycleId') as string;
  const newStatus = parseCycleStatus(formData.get('newStatus'));

  if (!cycleId || !newStatus) return { ok: false, error: 'Cycle and new status are required.' };

  const validTransitions: Partial<Record<CycleStatus, CycleStatus[]>> = {
    PLANNING: ['ACTIVE'],
    ACTIVE: ['CLOSING'],
    CLOSING: ['CLOSED'],
  };

  try {
    assertWritableCycleId(cycleId);
    const db = await getDb();
    const cycle = await db.cycle.findUnique({ where: { id: cycleId } });
    if (!cycle) return { ok: false, error: 'Cycle not found.' };

    const allowed = validTransitions[cycle.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return { ok: false, error: `Cannot transition from ${cycle.status} to ${newStatus}.` };
    }

    await db.cycle.update({
      where: { id: cycleId },
      data: { status: newStatus },
    });
    await writeAuditLog('TRANSITION_CYCLE', 'Cycle', cycleId, { from: cycle.status, to: newStatus });
    await notifyCycleTransition(cycle.sequenceNo, cycle.status, newStatus);
    revalidatePath('/cycles');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function setRetainedCapital(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('TRANSITION_CYCLE');

  const cycleId = formData.get('cycleId') as string;
  const retainedCapital = formData.get('retainedCapital') as string;

  if (!cycleId || !retainedCapital) {
    return { ok: false, error: 'Cycle and retained capital amount are required.' };
  }

  try {
    assertWritableCycleId(cycleId);
    const amount = parseMoneyInput(retainedCapital, 'Retained capital');
    const db = await getDb();
    const cycle = await db.cycle.findUnique({ where: { id: cycleId } });
    if (!cycle) return { ok: false, error: 'Cycle not found.' };

    if (cycle.status !== 'CLOSING') {
      return { ok: false, error: 'Retained capital can only be set on a CLOSING cycle.' };
    }

    await db.cycle.update({
      where: { id: cycleId },
      data: { retainedCapital: amount },
    });
    await writeAuditLog('SET_RETAINED_CAPITAL', 'Cycle', cycleId, { retainedCapital: amount });
    revalidatePath('/cycles');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sizeSleeves(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('SIZE_SLEEVES');

  const cycleId = formData.get('cycleId') as string;
  const protection = formData.get('protection') as string;
  const operatingAlpha = formData.get('operatingAlpha') as string;
  const marketAlpha = formData.get('marketAlpha') as string;
  const reserve = formData.get('reserve') as string;
  const loanBook = formData.get('loanBook') as string;

  if (!cycleId) return { ok: false, error: 'Cycle is required.' };

  const sleeves = [
    { type: SleeveType.PROTECTION, amount: protection },
    { type: SleeveType.OPERATING_ALPHA, amount: operatingAlpha },
    { type: SleeveType.MARKET_ALPHA, amount: marketAlpha },
    { type: SleeveType.RESERVE, amount: reserve },
    { type: SleeveType.LOAN_BOOK, amount: loanBook },
  ];

  try {
    assertWritableCycleId(cycleId);
    const db = await getDb();
    const cycle = await db.cycle.findUnique({
      where: { id: cycleId },
      include: { investorContributions: true },
    });
    if (!cycle) return { ok: false, error: 'Cycle not found.' };
    if (cycle.status === 'CLOSED') return { ok: false, error: 'Closed cycles cannot be resized.' };

    const openingNAV = cycle.openingNAV == null ? null : new Decimal(String(cycle.openingNAV));
    const newContributions = cycle.investorContributions.reduce(
      (sum: Decimal, contribution: { amount: unknown }) => sum.plus(new Decimal(String(contribution.amount))),
      new Decimal(0),
    );
    const parsedSleeves = sleeves
      .filter((sleeve) => sleeve.amount)
      .map((sleeve) => ({
        type: sleeve.type,
        amount: parseMoneyInput(sleeve.amount, `${sleeve.type} amount`),
      }));
    const operatingAlphaAmount = parsedSleeves.find((sleeve) => sleeve.type === 'OPERATING_ALPHA')?.amount ?? '0.00';

    if (!validateRetainedCapitalRule(new Decimal(operatingAlphaAmount), newContributions)) {
      return {
        ok: false,
        error: `Operating Alpha cannot exceed new capital contributions for the cycle (${newContributions.toFixed(2)}).`,
      };
    }

    if (openingNAV) {
      const totalFunded = parsedSleeves.reduce((sum, sleeve) => sum.plus(sleeve.amount), new Decimal(0));
      if (totalFunded.gt(openingNAV)) {
        return {
          ok: false,
          error: `Total sleeve funding cannot exceed opening NAV (${openingNAV.toFixed(2)}).`,
        };
      }
    }

    for (const sleeve of sleeves) {
      if (!sleeve.amount) continue;
      const amount = parseMoneyInput(sleeve.amount, `${sleeve.type} amount`);
      await db.sleeve.upsert({
        where: { cycleId_type: { cycleId, type: sleeve.type } },
        create: {
          cycleId,
          type: sleeve.type,
          targetAmount: amount,
          fundedAmount: amount,
        },
        update: {
          targetAmount: amount,
          fundedAmount: amount,
        },
      });
    }
    await writeAuditLog('SIZE_SLEEVES', 'Sleeve', cycleId, {
      sleeves: parsedSleeves,
      newContributions: newContributions.toFixed(2),
      openingNAV: openingNAV?.toFixed(2) ?? null,
    });
    revalidatePath('/cycles');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
