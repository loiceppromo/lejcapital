'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requireAdminAccess } from '@/lib/auth/server';
import { parseMoneyInput, parseOptionalMoneyInput, parseRateInput } from '@/lib/server/financial-inputs';
import { createLedgerEntryRecord } from '@/lib/server/ledger';
import { Decimal, generateSchedule, type InterestMethod } from '@/lib/finance';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

type RepaymentBucket = 'fees' | 'interest' | 'principal';

const repaymentOrders: Record<string, RepaymentBucket[]> = {
  FEES_INTEREST_PRINCIPAL: ['fees', 'interest', 'principal'],
  FEES_PRINCIPAL_INTEREST: ['fees', 'principal', 'interest'],
  PRINCIPAL_INTEREST_FEES: ['principal', 'interest', 'fees'],
};

function allocateRepaymentByPolicy({
  amount,
  feesRemaining,
  interestRemaining,
  principalRemaining,
  policy,
}: {
  amount: Decimal;
  feesRemaining: Decimal;
  interestRemaining: Decimal;
  principalRemaining: Decimal;
  policy: string;
}) {
  const allocations: Record<RepaymentBucket, Decimal> = {
    fees: new Decimal(0),
    interest: new Decimal(0),
    principal: new Decimal(0),
  };
  const remainingByBucket: Record<RepaymentBucket, Decimal> = {
    fees: feesRemaining,
    interest: interestRemaining,
    principal: principalRemaining,
  };
  let remainingPayment = amount;

  for (const bucket of repaymentOrders[policy] ?? repaymentOrders.FEES_INTEREST_PRINCIPAL) {
    const allocated = Decimal.min(remainingPayment, remainingByBucket[bucket]);
    allocations[bucket] = allocations[bucket].plus(allocated);
    remainingPayment = remainingPayment.minus(allocated);
  }

  if (remainingPayment.gt(0)) {
    allocations.principal = allocations.principal.plus(remainingPayment);
  }

  return allocations;
}

export async function addBorrower(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requireAdminAccess();

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const idType = formData.get('idType') as string;
  const idNumber = formData.get('idNumber') as string;

  if (!name) return { ok: false, error: 'Borrower name is required.' };

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const borrower = await (db as any).borrower.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        idType: idType || null,
        idNumber: idNumber || null,
      },
    });
    await writeAuditLog('ADD_BORROWER', 'Borrower', borrower.id as string, { name, email, phone, idType });
    revalidatePath('/loans');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function originateLoan(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requireAdminAccess();

  const borrowerId = formData.get('borrowerId') as string;
  const principal = formData.get('principal') as string;
  const interestRate = formData.get('interestRate') as string;
  const interestMethod = formData.get('interestMethod') as string;
  const termMonths = formData.get('termMonths') as string;
  const originationFee = formData.get('originationFee') as string;
  const collateralDesc = formData.get('collateralDesc') as string;
  const collateralValue = formData.get('collateralValue') as string;
  const fundingCycleId = formData.get('fundingCycleId') as string;
  const disbursementDate = formData.get('disbursementDate') as string;
  const originationFeeMethod = (formData.get('originationFeeMethod') as string) || 'DEDUCT_FROM_DISBURSEMENT';
  const repaymentAllocOrder = (formData.get('repaymentAllocOrder') as string) || 'FEES_INTEREST_PRINCIPAL';

  if (!borrowerId || !principal || !interestRate || !termMonths || !disbursementDate) {
    return { ok: false, error: 'Borrower, principal, interest rate, term, and disbursement date are required.' };
  }

  try {
    const principalAmount = parseMoneyInput(principal, 'Principal');
    const annualRate = parseRateInput(interestRate, 'Interest rate');
    const parsedTermMonths = parseInt(termMonths, 10);
    const method = (interestMethod || 'REDUCING_BALANCE') as InterestMethod;
    const parsedOriginationFee = parseOptionalMoneyInput(originationFee, 'Origination fee') ?? '0.00';
    const disbursedAt = new Date(disbursementDate);
    if (Number.isNaN(disbursedAt.getTime())) {
      return { ok: false, error: 'Disbursement date is invalid.' };
    }
    if (
      originationFeeMethod === 'DEDUCT_FROM_DISBURSEMENT' &&
      new Decimal(parsedOriginationFee).gt(new Decimal(principalAmount))
    ) {
      return { ok: false, error: 'Origination fee cannot exceed principal when deducted from disbursement.' };
    }

    const schedule = generateSchedule({
      principal: new Decimal(principalAmount),
      annualRate: new Decimal(annualRate),
      termMonths: parsedTermMonths,
      method,
      disbursementDate: disbursedAt,
    });

    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loan = await (db as any).$transaction(async (tx: any) => {
      const createdLoan = await tx.loan.create({
        data: {
          borrowerId,
          fundingCycleId: fundingCycleId || null,
          principal: principalAmount,
          interestRate: annualRate,
          interestMethod: method,
          termMonths: parsedTermMonths,
          disbursementDate: disbursedAt,
          status: 'ACTIVE',
          originationFee: parsedOriginationFee,
          originationFeeMethod,
          repaymentAllocOrder,
          collateralDesc: collateralDesc || null,
          collateralValue: parseOptionalMoneyInput(collateralValue, 'Collateral value'),
        },
      });

      await tx.loanScheduleItem.createMany({
        data: schedule.map((item) => ({
          loanId: createdLoan.id,
          dueDate: item.dueDate,
          principalDue: item.principalDue.toFixed(2),
          interestDue: item.interestDue.toFixed(2),
          totalDue: item.totalDue.toFixed(2),
          feesDue: '0.00',
          amountPaid: '0.00',
          status: 'SCHEDULED',
          daysPastDue: 0,
        })),
      });

      await createLedgerEntryRecord(tx, {
        date: disbursedAt,
        account: 'Loan book',
        description: `Loan disbursed: ${createdLoan.id}`,
        direction: 'OUT',
        amount: principalAmount,
        source: 'Loan',
        cycleId: fundingCycleId || null,
      });

      if (new Decimal(parsedOriginationFee).gt(0) && originationFeeMethod === 'DEDUCT_FROM_DISBURSEMENT') {
        await createLedgerEntryRecord(tx, {
          date: disbursedAt,
          account: 'Origination fees',
          description: `Origination fee retained: ${createdLoan.id}`,
          direction: 'IN',
          amount: parsedOriginationFee,
          source: 'Loan',
          cycleId: fundingCycleId || null,
        });
      }

      return createdLoan;
    });
    await writeAuditLog('ORIGINATE_LOAN', 'Loan', loan.id as string, {
      borrowerId,
      principal: principalAmount,
      interestRate: annualRate,
      termMonths: parsedTermMonths,
      disbursementDate,
      originationFee: parsedOriginationFee,
      originationFeeMethod,
      repaymentAllocOrder,
      scheduleItems: schedule.length,
    });
    revalidatePath('/loans');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function recordLoanRepayment(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requireAdminAccess();

  const loanId = formData.get('loanId') as string;
  const amountReceived = formData.get('amountReceived') as string;
  const dateReceived = formData.get('dateReceived') as string;
  const scheduleItemId = formData.get('scheduleItemId') as string;

  if (!loanId || !scheduleItemId || !amountReceived || !dateReceived) {
    return { ok: false, error: 'Loan, schedule item, amount, and date are required.' };
  }

  try {
    const amount = parseMoneyInput(amountReceived, 'Amount received');
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repayment = await (db as any).$transaction(async (tx: any) => {
      const scheduleItem = await tx.loanScheduleItem.findUnique({
        where: { id: scheduleItemId },
        include: { loan: true, repayments: true },
      });

      if (!scheduleItem || scheduleItem.loanId !== loanId) {
        throw new Error('Schedule item not found for selected loan.');
      }

      const paidFees = scheduleItem.repayments.reduce((sum: Decimal, item: { allocatedToFees: unknown }) => sum.plus(new Decimal(String(item.allocatedToFees))), new Decimal(0));
      const paidInterest = scheduleItem.repayments.reduce((sum: Decimal, item: { allocatedToInterest: unknown }) => sum.plus(new Decimal(String(item.allocatedToInterest))), new Decimal(0));
      const paidPrincipal = scheduleItem.repayments.reduce((sum: Decimal, item: { allocatedToPrincipal: unknown }) => sum.plus(new Decimal(String(item.allocatedToPrincipal))), new Decimal(0));

      const feesRemaining = Decimal.max(new Decimal(0), new Decimal(String(scheduleItem.feesDue)).minus(paidFees));
      const interestRemaining = Decimal.max(new Decimal(0), new Decimal(String(scheduleItem.interestDue)).minus(paidInterest));
      const principalRemaining = Decimal.max(new Decimal(0), new Decimal(String(scheduleItem.principalDue)).minus(paidPrincipal));
      const allocations = allocateRepaymentByPolicy({
        amount: new Decimal(amount),
        feesRemaining,
        interestRemaining,
        principalRemaining,
        policy: String(scheduleItem.loan.repaymentAllocOrder),
      });
      const feesAllocated = allocations.fees;
      const interestAllocated = allocations.interest;
      const principalAllocated = allocations.principal;

      const totalPaid = new Decimal(String(scheduleItem.amountPaid)).plus(amount);
      const totalDue = new Decimal(String(scheduleItem.totalDue));
      const nextStatus = totalPaid.gte(totalDue) ? 'PAID' : totalPaid.gt(0) ? 'PARTIAL' : scheduleItem.status;

      const created = await tx.loanRepayment.create({
        data: {
          loanId,
          scheduleItemId,
          amountReceived: amount,
          dateReceived: new Date(dateReceived),
          allocatedToPrincipal: principalAllocated.toFixed(2),
          allocatedToInterest: interestAllocated.toFixed(2),
          allocatedToFees: feesAllocated.toFixed(2),
        },
      });

      await tx.loanScheduleItem.update({
        where: { id: scheduleItemId },
        data: {
          amountPaid: totalPaid.toFixed(2),
          status: nextStatus,
        },
      });

      if (feesAllocated.gt(0)) {
        await createLedgerEntryRecord(tx, {
          date: dateReceived,
          account: 'Origination fees',
          description: `Loan fee repayment: ${loanId}`,
          direction: 'IN',
          amount: feesAllocated.toFixed(2),
          source: 'LoanRepayment',
          cycleId: scheduleItem.loan.fundingCycleId ?? null,
        });
      }

      if (interestAllocated.gt(0)) {
        await createLedgerEntryRecord(tx, {
          date: dateReceived,
          account: 'Loan interest',
          description: `Loan interest repayment: ${loanId}`,
          direction: 'IN',
          amount: interestAllocated.toFixed(2),
          source: 'LoanRepayment',
          cycleId: scheduleItem.loan.fundingCycleId ?? null,
        });
      }

      if (principalAllocated.gt(0)) {
        await createLedgerEntryRecord(tx, {
          date: dateReceived,
          account: 'Loan principal repayment',
          description: `Loan principal repayment: ${loanId}`,
          direction: 'IN',
          amount: principalAllocated.toFixed(2),
          source: 'LoanRepayment',
          cycleId: scheduleItem.loan.fundingCycleId ?? null,
        });
      }

      return created;
    });
    await writeAuditLog('RECORD_LOAN_REPAYMENT', 'LoanRepayment', repayment.id as string, {
      loanId,
      scheduleItemId,
      amountReceived: amount,
      dateReceived,
    });
    revalidatePath('/loans');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
