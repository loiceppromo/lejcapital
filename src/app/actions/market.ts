'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requireAdminAccess } from '@/lib/auth/server';
import { parseMoneyInput, parseOptionalMoneyInput, parseOptionalRateInput } from '@/lib/server/financial-inputs';
import { writeAuditLog } from './audit';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function addHolding(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected. Running in seed mode.' };
  await requireAdminAccess();

  const cycleId = formData.get('cycleId') as string;
  const instrumentType = formData.get('instrumentType') as string;
  const name = formData.get('name') as string;
  const amountInvested = formData.get('amountInvested') as string;
  const currentValue = formData.get('currentValue') as string;
  const returnRate = formData.get('returnRate') as string;
  const maturityDate = formData.get('maturityDate') as string;
  const purchaseDate = formData.get('purchaseDate') as string;

  if (!name || !amountInvested || !purchaseDate || !instrumentType) {
    return { ok: false, error: 'Name, instrument type, amount invested, and purchase date are required.' };
  }

  try {
    const invested = parseMoneyInput(amountInvested, 'Amount invested');
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const holding = await (db as any).marketHolding.create({
      data: {
        cycleId: cycleId || undefined,
        instrumentType,
        name,
        amountInvested: invested,
        currentValue: parseOptionalMoneyInput(currentValue, 'Current value') ?? invested,
        returnRate: parseOptionalRateInput(returnRate, 'Return rate'),
        maturityDate: maturityDate ? new Date(maturityDate) : null,
        purchaseDate: new Date(purchaseDate),
      },
    });
    await writeAuditLog('ADD_HOLDING', 'MarketHolding', holding.id as string, {
      cycleId: cycleId || null,
      instrumentType,
      amountInvested: invested,
      currentValue: currentValue || invested,
      name,
    });
    revalidatePath('/market');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
