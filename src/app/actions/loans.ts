'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function addBorrower(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const idType = formData.get('idType') as string;
  const idNumber = formData.get('idNumber') as string;

  if (!name) return { ok: false, error: 'Borrower name is required.' };

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).borrower.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        idType: idType || null,
        idNumber: idNumber || null,
      },
    });
    await writeAuditLog('ADD_BORROWER', 'Borrower', name, { name, email });
    revalidatePath('/loans');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function originateLoan(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const borrowerId = formData.get('borrowerId') as string;
  const principal = formData.get('principal') as string;
  const interestRate = formData.get('interestRate') as string;
  const interestMethod = formData.get('interestMethod') as string;
  const termMonths = formData.get('termMonths') as string;
  const originationFee = formData.get('originationFee') as string;
  const collateralDesc = formData.get('collateralDesc') as string;
  const collateralValue = formData.get('collateralValue') as string;
  const fundingCycleId = formData.get('fundingCycleId') as string;

  if (!borrowerId || !principal || !interestRate || !termMonths) {
    return { ok: false, error: 'Borrower, principal, interest rate, and term are required.' };
  }

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).loan.create({
      data: {
        borrowerId,
        fundingCycleId: fundingCycleId || null,
        principal: parseFloat(principal),
        interestRate: parseFloat(interestRate) / 100, // Convert from percentage
        interestMethod: interestMethod || 'REDUCING_BALANCE',
        termMonths: parseInt(termMonths, 10),
        originationFee: originationFee ? parseFloat(originationFee) : 0,
        collateralDesc: collateralDesc || null,
        collateralValue: collateralValue ? parseFloat(collateralValue) : null,
      },
    });
    await writeAuditLog('ORIGINATE_LOAN', 'Loan', borrowerId, { principal, interestRate, termMonths });
    revalidatePath('/loans');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function recordLoanRepayment(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };

  const loanId = formData.get('loanId') as string;
  const amountReceived = formData.get('amountReceived') as string;
  const dateReceived = formData.get('dateReceived') as string;
  const allocatedToPrincipal = formData.get('allocatedToPrincipal') as string;
  const allocatedToInterest = formData.get('allocatedToInterest') as string;
  const allocatedToFees = formData.get('allocatedToFees') as string;

  if (!loanId || !amountReceived || !dateReceived) {
    return { ok: false, error: 'Loan, amount, and date are required.' };
  }

  const amount = parseFloat(amountReceived);
  const principal = allocatedToPrincipal ? parseFloat(allocatedToPrincipal) : amount;
  const interest = allocatedToInterest ? parseFloat(allocatedToInterest) : 0;
  const fees = allocatedToFees ? parseFloat(allocatedToFees) : 0;

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).loanRepayment.create({
      data: {
        loanId,
        amountReceived: amount,
        dateReceived: new Date(dateReceived),
        allocatedToPrincipal: principal,
        allocatedToInterest: interest,
        allocatedToFees: fees,
      },
    });
    await writeAuditLog('RECORD_LOAN_REPAYMENT', 'LoanRepayment', loanId, { amountReceived: amount, dateReceived });
    revalidatePath('/loans');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
