'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { parseRateInput } from '@/lib/server/financial-inputs';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

const engineRateFields = new Set(['roic', 'cashConversion', 'sellThrough', 'repeatDemand', 'operationalRisk']);

export async function resolveMissingData(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('RESOLVE_MISSING_DATA');

  const entityType = formData.get('entityType') as string;
  const entityId = formData.get('entityId') as string;
  const field = formData.get('field') as string;
  const value = String(formData.get('value') ?? '').trim();
  const source = String(formData.get('source') ?? '').trim();

  if (!entityType || !entityId || !field || !value || !source) {
    return { ok: false, error: 'Missing-data item, value, and source are required.' };
  }

  try {
    const db = await getDb();
    let after: Record<string, unknown>;

    if (entityType === 'Borrower' && field === 'idNumber') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const borrower = await (db as any).borrower.update({
        where: { id: entityId },
        data: { idNumber: value },
      });
      after = { entityType, entityId, field, value: borrower.idNumber, source };
    } else if (entityType === 'EngineCycleRecord' && engineRateFields.has(field)) {
      const parsedRate = parseRateInput(value, field);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const record = await (db as any).engineCycleRecord.update({
        where: { id: entityId },
        data: { [field]: parsedRate },
      });
      after = { entityType, entityId, field, value: parsedRate, source, cycleId: record.cycleId };
    } else {
      return { ok: false, error: 'This missing-data field cannot be resolved from the register yet.' };
    }

    await writeAuditLog('RESOLVE_MISSING_DATA', entityType, entityId, after);
    revalidatePath('/audit');
    revalidatePath('/dashboard');
    revalidatePath('/engines');
    revalidatePath('/loans');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
