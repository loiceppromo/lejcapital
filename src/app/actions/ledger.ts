'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import type { ActionResult } from './market';

export async function addLedgerEntry(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const date = formData.get('date') as string;
  const account = formData.get('account') as string;
  const description = formData.get('description') as string;
  const direction = formData.get('direction') as string;
  const amount = formData.get('amount') as string;
  const source = formData.get('source') as string;

  if (!date || !account || !description || !direction || !amount) {
    return { ok: false, error: 'Date, account, description, direction, and amount are required.' };
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { ok: false, error: 'Amount must be a positive number.' };
  }

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).ledgerEntry.create({
      data: {
        date: new Date(date),
        account,
        description,
        direction,
        amount: parsedAmount,
        source: source || 'Manual',
      },
    });

    // Also write an audit entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).auditLog.create({
      data: {
        action: 'CREATE_LEDGER_ENTRY',
        entityType: 'LedgerEntry',
        entityId: account,
        after: { account, direction, amount: parsedAmount, description },
      },
    });

    revalidatePath('/ledger');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
