'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requireAdminAccess } from '@/lib/auth/server';
import { REGIME_SPLITS, type Regime } from '@/lib/finance';
import { loadPlatformState } from '@/lib/data/queries';
import { getPCR } from '@/lib/platform/selectors';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

const regimes = new Set(['DEFENSIVE', 'NORMAL', 'OPPORTUNISTIC']);

export async function updateMarketPolicy(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requireAdminAccess();

  const cycleId = formData.get('cycleId') as string;
  const requestedRegime = formData.get('requestedRegime') as Regime;
  const undcDemandValidated = formData.get('undcDemandValidated') === 'on';
  const undcDemandRationale = String(formData.get('undcDemandRationale') ?? '').trim();
  const marketCatalystDocumented = formData.get('marketCatalystDocumented') === 'on';
  const marketCatalystRationale = String(formData.get('marketCatalystRationale') ?? '').trim();
  const noOpenOperationalIssues = formData.get('noOpenOperationalIssues') === 'on';
  const operationalRationale = String(formData.get('operationalRationale') ?? '').trim();

  if (!cycleId || !regimes.has(requestedRegime)) {
    return { ok: false, error: 'Cycle and requested regime are required.' };
  }
  if (undcDemandValidated && !undcDemandRationale) {
    return { ok: false, error: 'UNDC demand validation requires rationale.' };
  }
  if (marketCatalystDocumented && !marketCatalystRationale) {
    return { ok: false, error: 'Documented market catalyst requires rationale.' };
  }
  if (noOpenOperationalIssues && !operationalRationale) {
    return { ok: false, error: 'Operational issue clearance requires rationale.' };
  }

  try {
    const state = await loadPlatformState();
    const pcrAbove125 = getPCR({ ...state, activeCycleId: cycleId }).pcr.gte('1.25');
    const split = REGIME_SPLITS[requestedRegime];
    const db = await getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (db as any).$transaction(async (tx: any) => {
      const config = await tx.marketRegimeConfig.upsert({
        where: { regime: requestedRegime },
        create: {
          regime: requestedRegime,
          gsePct: split.gsePct.toFixed(6),
          tbillPct: split.tbillPct.toFixed(6),
          cashPct: split.cashPct.toFixed(6),
        },
        update: {
          gsePct: split.gsePct.toFixed(6),
          tbillPct: split.tbillPct.toFixed(6),
          cashPct: split.cashPct.toFixed(6),
        },
      });

      const cycle = await tx.cycle.update({
        where: { id: cycleId },
        data: { regimeId: config.id },
      });

      const trigger = await tx.opportunisticTrigger.upsert({
        where: { cycleId },
        create: {
          cycleId,
          pcrAbove125,
          undcDemandValidated,
          undcDemandRationale: undcDemandRationale || null,
          marketCatalystDocumented,
          marketCatalystRationale: marketCatalystRationale || null,
          noOpenOperationalIssues,
          operationalOverride: noOpenOperationalIssues,
          operationalRationale: operationalRationale || null,
        },
        update: {
          pcrAbove125,
          undcDemandValidated,
          undcDemandRationale: undcDemandRationale || null,
          marketCatalystDocumented,
          marketCatalystRationale: marketCatalystRationale || null,
          noOpenOperationalIssues,
          operationalOverride: noOpenOperationalIssues,
          operationalRationale: operationalRationale || null,
        },
      });

      return { cycle, trigger };
    });

    await writeAuditLog('UPDATE_MARKET_POLICY', 'Cycle', result.cycle.id as string, {
      cycleId,
      requestedRegime,
      pcrAbove125,
      undcDemandValidated,
      marketCatalystDocumented,
      noOpenOperationalIssues,
    });
    revalidatePath('/market');
    revalidatePath('/dashboard');
    revalidatePath('/risk');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
