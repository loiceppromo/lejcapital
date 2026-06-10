'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requireAdminAccess } from '@/lib/auth/server';
import { validateLedgerEntry } from '@/lib/fund/ledger';
import { createLedgerEntryRecord } from '@/lib/server/ledger';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function addLedgerEntry(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const date = formData.get('date') as string;
  const account = formData.get('account') as string;
  const description = formData.get('description') as string;
  const direction = formData.get('direction') as string;
  const amount = formData.get('amount') as string;
  const source = formData.get('source') as string;
  const cycleId = formData.get('cycleId') as string | null;

  if (!date || !account || !description || !direction || !amount) {
    return { ok: false, error: 'Date, account, description, direction, and amount are required.' };
  }

  const validationErrors = validateLedgerEntry({
    date,
    account,
    description,
    direction: direction as 'IN' | 'OUT',
    amount,
    source: source || 'Manual',
    cycleId,
  });
  if (validationErrors.length > 0) {
    return { ok: false, error: validationErrors.map((err) => err.message).join(' ') };
  }

  try {
    await requireAdminAccess();
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = await createLedgerEntryRecord(db as any, {
      date,
      account,
      description,
      direction: direction as 'IN' | 'OUT',
      amount,
      source: source || 'Manual',
      cycleId: cycleId || null,
    });

    await writeAuditLog('CREATE_LEDGER_ENTRY', 'LedgerEntry', entry.id as string, {
      account,
      direction,
      amount,
      description,
      source: source || 'Manual',
      cycleId: cycleId || null,
    });

    revalidatePath('/ledger');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
