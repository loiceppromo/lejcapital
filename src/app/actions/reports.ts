'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { loadPlatformState } from '@/lib/data/queries';
import { getOverview } from '@/lib/platform/selectors';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';
import type { Prisma } from '@/generated/prisma/client';

export async function captureDashboardSnapshot(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('CAPTURE_SNAPSHOT');

  const snapshotDate = (formData.get('snapshotDate') as string) || new Date().toISOString().slice(0, 10);
  const parsedDate = new Date(snapshotDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return { ok: false, error: 'Snapshot date is invalid.' };
  }

  try {
    const state = await loadPlatformState();
    const overview = getOverview(state);
    const createdAt = new Date().toISOString();
    const value: Prisma.InputJsonObject = {
      snapshotDate,
      createdAt,
      activeCycle: `Cycle ${overview.activeCycle.sequenceNo}`,
      cycleStatus: overview.activeCycle.status,
      currentNAV: overview.currentNAV.toFixed(2),
      pcr: overview.pcr.pcr.toFixed(6),
      pcrStatus: overview.pcr.status,
      investorPrincipalDue: overview.investorPrincipalDue.toFixed(2),
      netLoanBookValue: overview.loanMetrics.netValue.toFixed(2),
      totalProvisions: overview.loanMetrics.totalProvisions.toFixed(2),
      marketPortfolioValue: overview.marketPolicy.currentValues.total.toFixed(2),
      riskBreaches: overview.riskBreaches,
    };
    const db = await getDb();
    const snapshot = await db.reportSnapshot.create({
      data: {
        cycleId: overview.activeCycle.id,
        snapshotDate,
        label: `Dashboard snapshot ${snapshotDate}`,
        data: value,
      },
    });

    await writeAuditLog('CAPTURE_DASHBOARD_SNAPSHOT', 'ReportSnapshot', snapshot.id as string, value);
    revalidatePath('/reports');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
