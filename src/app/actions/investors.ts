'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requireAdminAccess } from '@/lib/auth/server';
import { parseMoneyInput } from '@/lib/server/financial-inputs';
import { createLedgerEntryRecord } from '@/lib/server/ledger';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function addInvestor(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requireAdminAccess();

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  if (!name) return { ok: false, error: 'Investor name is required.' };

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const investor = await (db as any).investor.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
      },
    });
    await writeAuditLog('ADD_INVESTOR', 'Investor', investor.id as string, { name, email, phone });
    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function recordContribution(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requireAdminAccess();

  const investorId = formData.get('investorId') as string;
  const cycleId = formData.get('cycleId') as string;
  const amount = formData.get('amount') as string;
  const dateReceived = formData.get('dateReceived') as string;

  if (!investorId || !cycleId || !amount || !dateReceived) {
    return { ok: false, error: 'Investor, cycle, amount, and date are required.' };
  }

  try {
    const parsedAmount = parseMoneyInput(amount, 'Contribution amount');
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contribution = await (db as any).$transaction(async (tx: any) => {
      const created = await tx.investorContribution.create({
        data: {
          investorId,
          cycleId,
          amount: parsedAmount,
          dateReceived: new Date(dateReceived),
        },
      });

      await createLedgerEntryRecord(tx, {
        date: dateReceived,
        account: 'Investor capital',
        description: 'Investor contribution received',
        direction: 'IN',
        amount: parsedAmount,
        source: 'InvestorContribution',
        cycleId,
      });

      return created;
    });
    await writeAuditLog('RECORD_INVESTOR_CONTRIBUTION', 'InvestorContribution', contribution.id as string, {
      investorId,
      cycleId,
      amount: parsedAmount,
      dateReceived,
    });
    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function recordInvestorRepayment(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requireAdminAccess();

  const investorId = formData.get('investorId') as string;
  const cycleId = formData.get('cycleId') as string;
  const principalDue = formData.get('principalDue') as string;
  const amountRepaid = formData.get('amountRepaid') as string;
  const repaymentDate = formData.get('repaymentDate') as string;

  if (!investorId || !cycleId || !principalDue || !amountRepaid || !repaymentDate) {
    return { ok: false, error: 'All fields are required.' };
  }

  try {
    const parsedPrincipalDue = parseMoneyInput(principalDue, 'Principal due');
    const parsedAmountRepaid = parseMoneyInput(amountRepaid, 'Amount repaid');
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repayment = await (db as any).$transaction(async (tx: any) => {
      const created = await tx.investorRepayment.create({
        data: {
          investorId,
          cycleId,
          principalDue: parsedPrincipalDue,
          amountRepaid: parsedAmountRepaid,
          repaymentDate: new Date(repaymentDate),
        },
      });

      await createLedgerEntryRecord(tx, {
        date: repaymentDate,
        account: 'Investor capital',
        description: 'Investor principal repayment',
        direction: 'OUT',
        amount: parsedAmountRepaid,
        source: 'InvestorRepayment',
        cycleId,
      });

      return created;
    });
    await writeAuditLog('RECORD_INVESTOR_REPAYMENT', 'InvestorRepayment', repayment.id as string, {
      investorId,
      cycleId,
      principalDue: parsedPrincipalDue,
      amountRepaid: parsedAmountRepaid,
      repaymentDate,
    });
    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
