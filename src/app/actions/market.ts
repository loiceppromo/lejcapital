'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { parseMoneyInput, parseOptionalMoneyInput, parseOptionalRateInput } from '@/lib/server/financial-inputs';
import { createLedgerEntryRecord } from '@/lib/server/ledger';
import { writeAuditLog } from './audit';
import { InstrumentType } from '@/generated/prisma/client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function parseInstrumentType(value: FormDataEntryValue | null): InstrumentType | null {
  const instrumentType = String(value ?? '');
  return Object.values(InstrumentType).includes(instrumentType as InstrumentType)
    ? instrumentType as InstrumentType
    : null;
}

export async function addHolding(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected. Running in seed mode.' };
  await requirePermission('ADD_HOLDING');

  const cycleId = formData.get('cycleId') as string;
  const instrumentType = parseInstrumentType(formData.get('instrumentType'));
  const name = formData.get('name') as string;
  const amountInvested = formData.get('amountInvested') as string;
  const currentValue = formData.get('currentValue') as string;
  const returnRate = formData.get('returnRate') as string;
  const maturityDate = formData.get('maturityDate') as string;
  const purchaseDate = formData.get('purchaseDate') as string;

  if (!cycleId || !name || !amountInvested || !purchaseDate || !instrumentType) {
    return { ok: false, error: 'Cycle, name, instrument type, amount invested, and purchase date are required.' };
  }

  try {
    const invested = parseMoneyInput(amountInvested, 'Amount invested');
    const db = await getDb();
    const accountByInstrument: Record<InstrumentType, string> = {
      GSE_EQUITY: 'GSE equity',
      TBILL: 'T-Bill',
      CASH: 'Cash',
    };
    const holding = await db.$transaction(async (tx) => {
      const created = await tx.marketHolding.create({
        data: {
          cycleId,
          instrumentType,
          name,
          amountInvested: invested,
          currentValue: parseOptionalMoneyInput(currentValue, 'Current value') ?? invested,
          returnRate: parseOptionalRateInput(returnRate, 'Return rate'),
          maturityDate: maturityDate ? new Date(maturityDate) : null,
          purchaseDate: new Date(purchaseDate),
        },
      });

      await createLedgerEntryRecord(tx, {
        date: purchaseDate,
        account: accountByInstrument[instrumentType],
        description: `Market holding added: ${name}`,
        direction: 'OUT',
        amount: invested,
        source: 'MarketTrade',
        cycleId,
      });

      return created;
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
