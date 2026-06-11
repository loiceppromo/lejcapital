'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

const RESET_PHRASE = 'RESET LEJ CAPITAL';
const MIN_RESET_WAIT_MS = 30_000;
const MAX_RESET_WINDOW_MS = 10 * 60_000;

export async function resetOperationalSystem(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('MANAGE_SETTINGS');

  const phrase = String(formData.get('confirmation') ?? '').trim();
  const startedAt = Number(String(formData.get('startedAt') ?? '0'));
  const elapsed = Date.now() - startedAt;

  if (phrase !== RESET_PHRASE) {
    return { ok: false, error: `Type exactly "${RESET_PHRASE}" to confirm.` };
  }
  if (!Number.isFinite(startedAt) || elapsed < MIN_RESET_WAIT_MS) {
    return { ok: false, error: 'The 30-second safety countdown has not completed.' };
  }
  if (elapsed > MAX_RESET_WINDOW_MS) {
    return { ok: false, error: 'Reset confirmation expired. Restart the countdown.' };
  }

  try {
    const db = await getDb();
    await writeAuditLog('RESET_SYSTEM_REQUESTED', 'System', 'operational-data', {
      kept: ['User', 'AuditLog', 'MarketRegimeConfig', 'ReturnAssumption'],
      cleared: [
        'Notifications',
        'Report snapshots',
        'IC decisions',
        'Document notes',
        'Waterfalls',
        'Ledger entries',
        'Loans',
        'Borrowers',
        'Investors',
        'Market holdings',
        'Operating businesses',
        'Cycles',
      ],
    });

    await db.$transaction(async (tx) => {
      await tx.notification.deleteMany({});
      await tx.reportSnapshot.deleteMany({});
      await tx.iCDecision.deleteMany({});
      await tx.documentNote.deleteMany({});
      await tx.waterfallLine.deleteMany({});
      await tx.waterfallRun.deleteMany({});
      await tx.loanRepayment.deleteMany({});
      await tx.loanScheduleItem.deleteMany({});
      await tx.loan.deleteMany({});
      await tx.borrower.deleteMany({});
      await tx.ledgerEntry.deleteMany({});
      await tx.marketHolding.deleteMany({});
      await tx.engineCycleRecord.deleteMany({});
      await tx.operatingEngine.deleteMany({});
      await tx.investorRepayment.deleteMany({});
      await tx.investorContribution.deleteMany({});
      await tx.investor.deleteMany({});
      await tx.sleeve.deleteMany({});
      await tx.opportunisticTrigger.deleteMany({});
      await tx.cycle.deleteMany({});
      await tx.systemConfig.deleteMany({});
    });

    await writeAuditLog('RESET_SYSTEM_COMPLETED', 'System', 'operational-data', {
      completedAt: new Date().toISOString(),
      usersPreserved: true,
      auditLogsPreserved: true,
    });

    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
