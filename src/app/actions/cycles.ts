'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function createCycle(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const sequenceNo = formData.get('sequenceNo') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const openingNAV = formData.get('openingNAV') as string;

  if (!sequenceNo || !startDate || !endDate) {
    return { ok: false, error: 'Sequence number, start date, and end date are required.' };
  }

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).cycle.create({
      data: {
        sequenceNo: parseInt(sequenceNo, 10),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        openingNAV: openingNAV ? parseFloat(openingNAV) : null,
        status: 'PLANNING',
      },
    });
    await writeAuditLog('CREATE_CYCLE', 'Cycle', `Cycle ${sequenceNo}`, { sequenceNo, startDate, endDate });
    revalidatePath('/cycles');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function transitionCycle(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const cycleId = formData.get('cycleId') as string;
  const newStatus = formData.get('newStatus') as string;

  if (!cycleId || !newStatus) return { ok: false, error: 'Cycle and new status are required.' };

  const validTransitions: Record<string, string[]> = {
    PLANNING: ['ACTIVE'],
    ACTIVE: ['CLOSING'],
    CLOSING: ['CLOSED'],
  };

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cycle = await (db as any).cycle.findUnique({ where: { id: cycleId } });
    if (!cycle) return { ok: false, error: 'Cycle not found.' };

    const allowed = validTransitions[cycle.status as string] ?? [];
    if (!allowed.includes(newStatus)) {
      return { ok: false, error: `Cannot transition from ${cycle.status} to ${newStatus}.` };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).cycle.update({
      where: { id: cycleId },
      data: { status: newStatus },
    });
    await writeAuditLog('TRANSITION_CYCLE', 'Cycle', cycleId, { from: cycle.status, to: newStatus });
    revalidatePath('/cycles');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sizeSleeves(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const cycleId = formData.get('cycleId') as string;
  const protection = formData.get('protection') as string;
  const operatingAlpha = formData.get('operatingAlpha') as string;
  const marketAlpha = formData.get('marketAlpha') as string;
  const reserve = formData.get('reserve') as string;
  const loanBook = formData.get('loanBook') as string;

  if (!cycleId) return { ok: false, error: 'Cycle is required.' };

  const sleeves = [
    { type: 'PROTECTION', amount: protection },
    { type: 'OPERATING_ALPHA', amount: operatingAlpha },
    { type: 'MARKET_ALPHA', amount: marketAlpha },
    { type: 'RESERVE', amount: reserve },
    { type: 'LOAN_BOOK', amount: loanBook },
  ];

  try {
    const db = await getDb();
    for (const sleeve of sleeves) {
      if (!sleeve.amount) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).sleeve.upsert({
        where: { cycleId_type: { cycleId, type: sleeve.type } },
        create: {
          cycleId,
          type: sleeve.type,
          targetAmount: parseFloat(sleeve.amount),
          fundedAmount: parseFloat(sleeve.amount),
        },
        update: {
          targetAmount: parseFloat(sleeve.amount),
          fundedAmount: parseFloat(sleeve.amount),
        },
      });
    }
    await writeAuditLog('SIZE_SLEEVES', 'Sleeve', cycleId, { sleeves: sleeves.filter((s) => s.amount) });
    revalidatePath('/cycles');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
