'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { parseOptionalMoneyInput, parseOptionalRateInput } from '@/lib/server/financial-inputs';
import { assertWritableCycleId } from '@/lib/server/cycle-guard';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function addEngine(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('ADD_ENGINE');

  const code = formData.get('code') as string;
  const name = formData.get('name') as string;
  const description = (formData.get('description') as string) || null;
  const logoUrl = (formData.get('logoUrl') as string) || null;

  if (!code || !name) return { ok: false, error: 'Engine code and name are required.' };

  try {
    const db = await getDb();
    const engine = await db.operatingEngine.create({
      data: { code: code.toUpperCase(), name, description, logoUrl, status: 'VALIDATION' },
    });
    await writeAuditLog('ADD_ENGINE', 'OperatingEngine', engine.id as string, { code: code.toUpperCase(), name, description });
    revalidatePath('/engines');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateEngine(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('UPDATE_ENGINE');

  const engineId = formData.get('engineId') as string;
  const name = (formData.get('name') as string) || undefined;
  const description = formData.has('description') ? (formData.get('description') as string) || null : undefined;
  const logoUrl = formData.has('logoUrl') ? (formData.get('logoUrl') as string) || null : undefined;
  const status = (formData.get('status') as string) || undefined;

  if (!engineId) return { ok: false, error: 'Engine ID is required.' };

  try {
    const db = await getDb();
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (status !== undefined) data.status = status;

    const engine = await db.operatingEngine.update({ where: { id: engineId }, data });
    await writeAuditLog('UPDATE_ENGINE', 'OperatingEngine', engine.id as string, { name, description, status });
    revalidatePath('/engines');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateEngineInputs(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('UPDATE_ENGINE');

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
    assertWritableCycleId(cycleId);
    const db = await getDb();
    const record = await db.engineCycleRecord.upsert({
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
    await writeAuditLog('UPDATE_ENGINE_INPUTS', 'EngineCycleRecord', record.id as string, {
      engineId,
      cycleId,
      roic,
      cashConversion,
      sellThrough,
    });
    revalidatePath('/engines');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
