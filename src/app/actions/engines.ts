'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function addEngine(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const code = formData.get('code') as string;
  const name = formData.get('name') as string;

  if (!code || !name) return { ok: false, error: 'Engine code and name are required.' };

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).operatingEngine.create({
      data: { code: code.toUpperCase(), name, status: 'VALIDATION' },
    });
    await writeAuditLog('ADD_ENGINE', 'OperatingEngine', code.toUpperCase(), { code, name });
    revalidatePath('/engines');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateEngineInputs(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const engineId = formData.get('engineId') as string;
  const cycleId = formData.get('cycleId') as string;
  const capitalAllocated = formData.get('capitalAllocated') as string;
  const profitReturned = formData.get('profitReturned') as string;
  const roic = formData.get('roic') as string;
  const cashConversion = formData.get('cashConversion') as string;
  const sellThrough = formData.get('sellThrough') as string;
  const repeatDemand = formData.get('repeatDemand') as string;
  const operationalRisk = formData.get('operationalRisk') as string;

  if (!engineId || !cycleId) return { ok: false, error: 'Engine and cycle are required.' };

  const parseOpt = (v: string | null) => (v && v.trim() ? parseFloat(v) / 100 : null);

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).engineCycleRecord.upsert({
      where: { engineId_cycleId: { engineId, cycleId } },
      create: {
        engineId,
        cycleId,
        capitalAllocated: capitalAllocated ? parseFloat(capitalAllocated) : null,
        profitReturned: profitReturned ? parseFloat(profitReturned) : null,
        roic: parseOpt(roic),
        cashConversion: parseOpt(cashConversion),
        sellThrough: parseOpt(sellThrough),
        repeatDemand: parseOpt(repeatDemand),
        operationalRisk: parseOpt(operationalRisk),
      },
      update: {
        capitalAllocated: capitalAllocated ? parseFloat(capitalAllocated) : undefined,
        profitReturned: profitReturned ? parseFloat(profitReturned) : undefined,
        roic: parseOpt(roic),
        cashConversion: parseOpt(cashConversion),
        sellThrough: parseOpt(sellThrough),
        repeatDemand: parseOpt(repeatDemand),
        operationalRisk: parseOpt(operationalRisk),
      },
    });
    await writeAuditLog('UPDATE_ENGINE_INPUTS', 'EngineCycleRecord', engineId, { cycleId, roic, cashConversion, sellThrough });
    revalidatePath('/engines');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
