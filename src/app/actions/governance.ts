'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission, getCurrentUser } from '@/lib/auth/server';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

const decisions = new Set(['INCREASE', 'MAINTAIN', 'REDUCE', 'EXIT']);

export async function recordICDecision(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const cycleId = formData.get('cycleId') as string;
  const position = String(formData.get('position') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();
  const rationale = String(formData.get('rationale') ?? '').trim();

  if (!cycleId || !position || !decision || !rationale) {
    return { ok: false, error: 'Cycle, position, decision, and rationale are required.' };
  }
  if (!decisions.has(decision)) {
    return { ok: false, error: 'Decision must be increase, maintain, reduce, or exit.' };
  }

  try {
    await requirePermission('RECORD_IC_DECISION');
    const actor = await getCurrentUser();
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const note = await (db as any).$transaction(async (tx: any) => {
      await tx.user.upsert({
        where: { email: actor.email ?? 'system@lej.local' },
        create: {
          id: actor.id ?? 'system-user',
          email: actor.email ?? 'system@lej.local',
          name: actor.email ?? 'System',
          role: 'FUND_MANAGER',
        },
        update: { active: true, role: 'FUND_MANAGER' },
      });

      return tx.iCDecision.create({
        data: {
          cycleId,
          decisionDate: new Date().toISOString().slice(0, 10),
          topic: position,
          resolution: decision,
          attendees: [rationale],
        },
      });
    });

    await writeAuditLog('RECORD_IC_DECISION', 'ICDecision', note.id as string, {
      cycleId,
      position,
      decision,
      rationale,
    });
    revalidatePath('/reports');
    revalidatePath('/engines');
    revalidatePath('/audit');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
