'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { RESET_DELETION_ORDER } from '@/lib/data/reset-plan';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

// ── Fund Parameter Settings ──

export interface FundParameters {
  cycleDeploymentReturn: string;
  loanRateCap: string;
  reserveFloor: string;
}

const FUND_PARAMS_KEY = 'fund-parameters';
const DEFAULT_FUND_PARAMS: FundParameters = {
  cycleDeploymentReturn: '10.00',
  loanRateCap: '60.00',
  reserveFloor: '0.00',
};

export async function loadFundParameters(): Promise<FundParameters> {
  if (!isDatabaseConfigured()) return DEFAULT_FUND_PARAMS;
  try {
    const db = await getDb();
    const row = await db.systemConfig.findUnique({ where: { key: FUND_PARAMS_KEY } });
    if (!row) return DEFAULT_FUND_PARAMS;
    const saved = row.value as Record<string, string>;
    return {
      cycleDeploymentReturn: saved.cycleDeploymentReturn ?? DEFAULT_FUND_PARAMS.cycleDeploymentReturn,
      loanRateCap: saved.loanRateCap ?? DEFAULT_FUND_PARAMS.loanRateCap,
      reserveFloor: saved.reserveFloor ?? DEFAULT_FUND_PARAMS.reserveFloor,
    };
  } catch {
    return DEFAULT_FUND_PARAMS;
  }
}

export async function saveFundParameters(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('MANAGE_SETTINGS');

  const cycleDeploymentReturn = String(formData.get('cycleDeploymentReturn') ?? '10.00').trim();
  const loanRateCap = String(formData.get('loanRateCap') ?? '60.00').trim();
  const reserveFloor = String(formData.get('reserveFloor') ?? '0.00').trim();

  for (const [label, val] of [['Cycle deployment return', cycleDeploymentReturn], ['Loan rate cap', loanRateCap], ['Reserve floor', reserveFloor]]) {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { ok: false, error: `${label} must be between 0 and 100.` };
    }
  }

  try {
    const db = await getDb();
    const params: FundParameters = {
      cycleDeploymentReturn: Number(cycleDeploymentReturn).toFixed(2),
      loanRateCap: Number(loanRateCap).toFixed(2),
      reserveFloor: Number(reserveFloor).toFixed(2),
    };
    await db.systemConfig.upsert({
      where: { key: FUND_PARAMS_KEY },
      update: { value: params as object },
      create: { key: FUND_PARAMS_KEY, value: params as object },
    });
    await writeAuditLog('UPDATE_FUND_PARAMETERS', 'SystemConfig', FUND_PARAMS_KEY, { ...params });
    revalidatePath('/settings');
    revalidatePath('/loans');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ── System Reset ──

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
        'Capital partners',
        'Market holdings',
        'Operating businesses',
        'Cycles',
      ],
    });

    // Single atomic transaction: either every operational table is cleared, or
    // nothing is (full rollback on any error). Order is derived from the Prisma
    // FK dependency graph — see RESET_DELETION_ORDER and its unit test, which
    // proves each table is deleted before any table it depends on.
    await db.$transaction(async (tx) => {
      const client = tx as unknown as Record<string, { deleteMany: (a: object) => Promise<unknown> }>;
      for (const model of RESET_DELETION_ORDER) {
        await client[model].deleteMany({});
      }
    });

    await writeAuditLog('RESET_SYSTEM_COMPLETED', 'System', 'operational-data', {
      completedAt: new Date().toISOString(),
      usersPreserved: true,
      auditLogsPreserved: true,
    });

    // Purge the entire route + client cache so no stale financial figures
    // survive on any page. `revalidatePath('/')` alone only refreshes the root
    // route; the layout form invalidates every page beneath the root layout.
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (err) {
    // The transaction is atomic: on any failure nothing was deleted. Log the
    // real error for operators, but never leak Prisma/SQL internals to the UI.
    console.error('[RESET_SYSTEM] reset failed — transaction rolled back:', err);
    try {
      await writeAuditLog('RESET_SYSTEM_FAILED', 'System', 'operational-data', {
        failedAt: new Date().toISOString(),
        reason: err instanceof Error ? err.message : 'Unknown error',
      });
    } catch {
      /* audit logging is best-effort on the failure path */
    }
    return {
      ok: false,
      error: 'Reset could not be completed. No data was deleted. Review the system logs and try again.',
    };
  }
}
