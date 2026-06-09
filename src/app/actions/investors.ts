'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function addInvestor(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  if (!name) return { ok: false, error: 'Investor name is required.' };

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).investor.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
      },
    });
    await writeAuditLog('INVESTOR_ACTION', 'Investor', 'investors', {});
    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function recordContribution(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const investorId = formData.get('investorId') as string;
  const cycleId = formData.get('cycleId') as string;
  const amount = formData.get('amount') as string;
  const dateReceived = formData.get('dateReceived') as string;

  if (!investorId || !cycleId || !amount || !dateReceived) {
    return { ok: false, error: 'Investor, cycle, amount, and date are required.' };
  }

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).investorContribution.create({
      data: {
        investorId,
        cycleId,
        amount: parseFloat(amount),
        dateReceived: new Date(dateReceived),
      },
    });
    await writeAuditLog('INVESTOR_ACTION', 'Investor', 'investors', {});
    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function recordInvestorRepayment(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const investorId = formData.get('investorId') as string;
  const cycleId = formData.get('cycleId') as string;
  const principalDue = formData.get('principalDue') as string;
  const amountRepaid = formData.get('amountRepaid') as string;
  const repaymentDate = formData.get('repaymentDate') as string;

  if (!investorId || !cycleId || !principalDue || !amountRepaid || !repaymentDate) {
    return { ok: false, error: 'All fields are required.' };
  }

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).investorRepayment.create({
      data: {
        investorId,
        cycleId,
        principalDue: parseFloat(principalDue),
        amountRepaid: parseFloat(amountRepaid),
        repaymentDate: new Date(repaymentDate),
      },
    });
    await writeAuditLog('INVESTOR_ACTION', 'Investor', 'investors', {});
    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
