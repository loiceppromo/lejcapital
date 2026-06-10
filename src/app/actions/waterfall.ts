'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { createLedgerEntryRecord } from '@/lib/server/ledger';
import { parseMoneyInput } from '@/lib/server/financial-inputs';
import { Decimal, WATERFALL_PRIORITIES, runWaterfall, type WaterfallClaim } from '@/lib/finance';
import { notifyWaterfallRun } from '@/lib/notifications/service';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

const waterfallLedgerAccounts: Record<string, string> = {
  INVESTOR_PRINCIPAL: 'Investor capital',
  SUPPLIER_LIABILITIES: 'Supplier payment',
  TAXES: 'Tax payment',
  CUSTOMER_REFUNDS: 'Customer refund',
  EMERGENCY_PRODUCTION: 'Emergency production',
  RESERVE_REBUILD: 'Reserve sleeve',
  REINVESTMENT: 'Market Alpha',
  EXPANSION: 'Other',
};

export async function runCycleWaterfall(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('RUN_WATERFALL');

  const cycleId = formData.get('cycleId') as string;
  const runDate = formData.get('runDate') as string;
  const totalCashAvailable = formData.get('totalCashAvailable') as string;

  if (!cycleId || !runDate || !totalCashAvailable) {
    return { ok: false, error: 'Cycle, run date, and total cash available are required.' };
  }

  try {
    const parsedCash = parseMoneyInput(totalCashAvailable, 'Total cash available');
    const claims: WaterfallClaim[] = WATERFALL_PRIORITIES.map((item) => ({
      priority: item.priority,
      claimType: item.claimType,
      amountClaimed: new Decimal(parseMoneyInput(formData.get(item.claimType), item.claimType.replaceAll('_', ' '))),
    }));
    const lines = runWaterfall(new Decimal(parsedCash), claims);
    const db = await getDb();

    const run = await db.$transaction(async (tx) => {
      const createdRun = await tx.waterfallRun.create({
        data: {
          cycleId,
          runDate: new Date(runDate),
          totalCashAvailable: parsedCash,
        },
      });

      await tx.waterfallLine.createMany({
        data: lines.map((line) => ({
          waterfallRunId: createdRun.id,
          priority: line.priority,
          claimType: line.claimType,
          amountClaimed: line.amountClaimed.toFixed(2),
          amountPaid: line.amountPaid.toFixed(2),
          fullyPaid: line.fullyPaid,
          cashAfter: line.cashAfter.toFixed(2),
        })),
      });

      for (const line of lines.filter((item) => item.amountPaid.gt(0))) {
        await createLedgerEntryRecord(tx, {
          date: runDate,
          account: waterfallLedgerAccounts[line.claimType] ?? 'Other',
          description: `Waterfall distribution: ${line.claimType.replaceAll('_', ' ')}`,
          direction: 'OUT',
          amount: line.amountPaid.toFixed(2),
          source: 'WaterfallDistribution',
          cycleId,
        });
      }

      return createdRun;
    });

    const totalDistributed = lines.reduce((sum, l) => sum.plus(l.amountPaid), new Decimal(0));
    // Look up cycle sequence number for notification
    const cycleForNotify = await db.cycle.findUnique({ where: { id: cycleId }, select: { sequenceNo: true } });
    await notifyWaterfallRun(cycleForNotify?.sequenceNo ?? 0, totalDistributed.toFixed(2));

    await writeAuditLog('RUN_WATERFALL', 'WaterfallRun', run.id as string, {
      cycleId,
      runDate,
      totalCashAvailable: parsedCash,
      lines: lines.map((line) => ({
        priority: line.priority,
        claimType: line.claimType,
        amountClaimed: line.amountClaimed.toFixed(2),
        amountPaid: line.amountPaid.toFixed(2),
        fullyPaid: line.fullyPaid,
        cashAfter: line.cashAfter.toFixed(2),
      })),
    });
    revalidatePath('/cycles');
    revalidatePath('/ledger');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
