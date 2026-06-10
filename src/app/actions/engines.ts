'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requireAdminAccess } from '@/lib/auth/server';
import { parseOptionalMoneyInput, parseOptionalRateInput } from '@/lib/server/financial-inputs';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function addEngine(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requireAdminAccess();

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
  await requireAdminAccess();

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

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).engineCycleRecord.upsert({
      where: { engineId_cycleId: { engineId, cycleId } },
      create: {
        engineId,
        cycleId,
        capitalAllocated: parseOptionalMoneyInput(capitalAllocated, 'Capital allocated'),
        profitReturned: parseOptionalMoneyInput(profitReturned, 'Profit returned'),
        roic: parseOptionalRateInput(roic, 'ROIC'),
        cashConversion: parseOptionalRateInput(cashConversion, 'Cash conversion'),
        sellThrough: parseOptionalRateInput(sellThrough, 'Sell-through'),
        repeatDemand: parseOptionalRateInput(repeatDemand, 'Repeat demand'),
        operationalRisk: parseOptionalRateInput(operationalRisk, 'Operational risk'),
      },
      update: {
        capitalAllocated: capitalAllocated ? parseOptionalMoneyInput(capitalAllocated, 'Capital allocated') : undefined,
        profitReturned: profitReturned ? parseOptionalMoneyInput(profitReturned, 'Profit returned') : undefined,
        roic: parseOptionalRateInput(roic, 'ROIC'),
        cashConversion: parseOptionalRateInput(cashConversion, 'Cash conversion'),
        sellThrough: parseOptionalRateInput(sellThrough, 'Sell-through'),
        repeatDemand: parseOptionalRateInput(repeatDemand, 'Repeat demand'),
        operationalRisk: parseOptionalRateInput(operationalRisk, 'Operational risk'),
      },
    });
    await writeAuditLog('UPDATE_ENGINE_INPUTS', 'EngineCycleRecord', engineId, { cycleId, roic, cashConversion, sellThrough });
    revalidatePath('/engines');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
