'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { parseMoneyInput } from '@/lib/server/financial-inputs';
import { createLedgerEntryRecord } from '@/lib/server/ledger';
import { notifyInvestorRepayment } from '@/lib/notifications/service';
import { calculatePackage, MIN_INVESTMENT } from '@/lib/finance/investor-packages';
import { Decimal } from '@/lib/finance';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export async function addInvestor(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('ADD_INVESTOR');

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const investmentAmountRaw = formData.get('investmentAmount') as string;
  const cycleId = formData.get('cycleId') as string;
  const notes = formData.get('notes') as string;

  if (!name) return { ok: false, error: 'Partner name is required.' };

  try {
    const db = await getDb();

    // If investment amount provided, create investor with cycle entry
    if (investmentAmountRaw && cycleId) {
      const investmentAmount = parseMoneyInput(investmentAmountRaw, 'Investment amount');
      if (Number(investmentAmount) < MIN_INVESTMENT) {
        return { ok: false, error: `Minimum contribution is GHS ${MIN_INVESTMENT.toLocaleString()}.` };
      }

      const pkg = calculatePackage(new Decimal(investmentAmount));
      const cycle = await db.cycle.findUnique({ where: { id: cycleId } });
      if (!cycle) return { ok: false, error: 'Selected cycle not found.' };

      const result = await db.$transaction(async (tx) => {
        const investor = await tx.investor.create({
          data: {
            name,
            email: email || null,
            phone: phone || null,
            notes: notes || null,
          },
        });

        const investorCycle = await tx.investorCycle.create({
          data: {
            investorId: investor.id,
            cycleId,
            investmentAmount: investmentAmount,
            packageTier: pkg.tier,
            cycleReturnRate: pkg.cycleReturnRate.toString(),
            preferredReturn: pkg.cycleReturnAmount.toString(),
            finalPayout: '0',
            cycleStartDate: cycle.startDate,
            cycleEndDate: cycle.endDate,
            giftEligible: pkg.giftEligible,
            giftTier: pkg.giftTier,
            giftStatus: pkg.giftEligible ? 'DUE' : 'NOT_ELIGIBLE',
          },
        });

        await tx.investorContribution.create({
          data: {
            investorId: investor.id,
            cycleId,
            amount: investmentAmount,
            dateReceived: new Date(),
          },
        });

        await createLedgerEntryRecord(tx, {
          date: new Date().toISOString().slice(0, 10),
          account: 'Partner capital',
          description: `Capital placed by ${name} — ${pkg.tier} package`,
          direction: 'IN',
          amount: investmentAmount,
          source: 'InvestorContribution',
          cycleId,
        });

        return { investor, investorCycle };
      });

      await writeAuditLog('ADD_INVESTOR', 'Investor', result.investor.id as string, {
        name, email, phone,
        investmentAmount: investmentAmount.toString(),
        tier: pkg.tier,
        cycleReturnRate: pkg.cycleReturnRate.toString(),
        preferredReturn: pkg.cycleReturnAmount.toString(),
        giftEligible: pkg.giftEligible,
        giftTier: pkg.giftTier,
      });
    } else {
      const investor = await db.investor.create({
        data: {
          name,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
        },
      });
      await writeAuditLog('ADD_INVESTOR', 'Investor', investor.id as string, { name, email, phone });
    }

    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function addInvestorCycle(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('ADD_INVESTOR');

  const investorId = formData.get('investorId') as string;
  const cycleId = formData.get('cycleId') as string;
  const investmentAmountRaw = formData.get('investmentAmount') as string;
  const previousCycleId = formData.get('previousCycleId') as string;

  if (!investorId || !cycleId || !investmentAmountRaw) {
    return { ok: false, error: 'Partner, cycle, and capital amount are required.' };
  }

  try {
    const investmentAmount = parseMoneyInput(investmentAmountRaw, 'Investment amount');
    if (Number(investmentAmount) < MIN_INVESTMENT) {
      return { ok: false, error: `Minimum contribution is GHS ${MIN_INVESTMENT.toLocaleString()}.` };
    }

    const pkg = calculatePackage(new Decimal(investmentAmount));
    const db = await getDb();
    const cycle = await db.cycle.findUnique({ where: { id: cycleId } });
    if (!cycle) return { ok: false, error: 'Selected cycle not found.' };

    const investorCycle = await db.$transaction(async (tx) => {
      const ic = await tx.investorCycle.create({
        data: {
          investorId,
          cycleId,
          investmentAmount,
          packageTier: pkg.tier,
          cycleReturnRate: pkg.cycleReturnRate.toString(),
          preferredReturn: pkg.cycleReturnAmount.toString(),
          finalPayout: '0',
          cycleStartDate: cycle.startDate,
          cycleEndDate: cycle.endDate,
          previousCycleId: previousCycleId || null,
          giftEligible: pkg.giftEligible,
          giftTier: pkg.giftTier,
          giftStatus: pkg.giftEligible ? 'DUE' : 'NOT_ELIGIBLE',
        },
      });

      if (previousCycleId) {
        await tx.investorCycle.update({
          where: { id: previousCycleId },
          data: { nextCycleId: ic.id, status: 'REINVESTED' },
        });
      }

      await tx.investorContribution.create({
        data: {
          investorId,
          cycleId,
          amount: investmentAmount,
          dateReceived: new Date(),
        },
      });

      await createLedgerEntryRecord(tx, {
        date: new Date().toISOString().slice(0, 10),
        account: 'Partner capital',
        description: `Capital placed — ${pkg.tier} package`,
        direction: 'IN',
        amount: investmentAmount,
        source: 'InvestorContribution',
        cycleId,
      });

      return ic;
    });

    await writeAuditLog('ADD_INVESTOR_CYCLE', 'InvestorCycle', investorCycle.id as string, {
      investorId, cycleId,
      investmentAmount: investmentAmount.toString(),
      tier: pkg.tier,
      previousCycleId: previousCycleId || null,
    });

    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function processReinvestment(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('RECORD_INVESTOR_REPAYMENT');

  const investorCycleId = formData.get('investorCycleId') as string;
  const preference = formData.get('payoutPreference') as string;
  const customPercent = formData.get('customPercent') as string;

  if (!investorCycleId || !preference) {
    return { ok: false, error: 'Capital cycle and payout preference are required.' };
  }

  try {
    const db = await getDb();
    const ic = await db.investorCycle.findUnique({ where: { id: investorCycleId } });
    if (!ic) return { ok: false, error: 'Capital cycle not found.' };

    const investment = new Decimal(String(ic.investmentAmount));
    const returns = new Decimal(String(ic.preferredReturn));
    const total = investment.add(returns);

    let reinvestmentAmount: Decimal;
    let cashPayout: Decimal;

    switch (preference) {
      case 'FULL_PAYOUT':
        cashPayout = total;
        reinvestmentAmount = new Decimal(0);
        break;
      case 'FULL_REINVESTMENT':
        cashPayout = new Decimal(0);
        reinvestmentAmount = total;
        break;
      case 'PRINCIPAL_REINVESTMENT':
        cashPayout = returns;
        reinvestmentAmount = investment;
        break;
      case 'CUSTOM': {
        const pct = Number(customPercent || '50') / 100;
        reinvestmentAmount = total.mul(new Decimal(pct));
        cashPayout = total.sub(reinvestmentAmount);
        break;
      }
      default:
        return { ok: false, error: 'Invalid payout preference.' };
    }

    await db.investorCycle.update({
      where: { id: investorCycleId },
      data: {
        payoutPreference: preference as 'FULL_PAYOUT' | 'FULL_REINVESTMENT' | 'PRINCIPAL_REINVESTMENT' | 'CUSTOM',
        reinvestmentAmount: reinvestmentAmount.toString(),
        cashPayoutAmount: cashPayout.toString(),
        finalPayout: cashPayout.toString(),
        reinvestmentConfirmed: true,
        reinvestmentDate: new Date(),
        status: reinvestmentAmount.gt(0) ? 'REINVESTED' : 'PAID_OUT',
      },
    });

    await writeAuditLog('PROCESS_REINVESTMENT', 'InvestorCycle', investorCycleId, {
      preference,
      reinvestmentAmount: reinvestmentAmount.toString(),
      cashPayout: cashPayout.toString(),
    });

    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateGiftStatus(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('ADD_INVESTOR');

  const investorCycleId = formData.get('investorCycleId') as string;
  const giftStatus = formData.get('giftStatus') as string;
  const giftSelected = formData.get('giftSelected') as string;
  const giftNotes = formData.get('giftNotes') as string;

  if (!investorCycleId || !giftStatus) {
    return { ok: false, error: 'Capital cycle and gift status are required.' };
  }

  try {
    const db = await getDb();
    await db.investorCycle.update({
      where: { id: investorCycleId },
      data: {
        giftStatus: giftStatus as 'NOT_ELIGIBLE' | 'DUE' | 'SELECTED' | 'PACKED' | 'DELIVERED',
        giftSelected: giftSelected || undefined,
        giftNotes: giftNotes || undefined,
        giftDeliveryDate: giftStatus === 'DELIVERED' ? new Date() : undefined,
      },
    });

    await writeAuditLog('UPDATE_GIFT_STATUS', 'InvestorCycle', investorCycleId, {
      giftStatus, giftSelected, giftNotes,
    });

    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateInvestorNotes(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('ADD_INVESTOR');

  const investorId = formData.get('investorId') as string;
  const notes = formData.get('notes') as string;
  const riskNotes = formData.get('riskNotes') as string;

  if (!investorId) return { ok: false, error: 'Partner ID is required.' };

  try {
    const db = await getDb();
    await db.investor.update({
      where: { id: investorId },
      data: {
        notes: notes ?? undefined,
        riskNotes: riskNotes ?? undefined,
      },
    });
    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateDocumentStatus(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('ADD_INVESTOR');

  const investorCycleId = formData.get('investorCycleId') as string;
  const field = formData.get('field') as string;
  const value = formData.get('value') === 'true';

  if (!investorCycleId || !field) {
    return { ok: false, error: 'Missing required fields.' };
  }

  const allowedFields = ['agreementUploaded', 'riskAckSigned', 'proofOfPayment'] as const;
  if (!allowedFields.includes(field as (typeof allowedFields)[number])) {
    return { ok: false, error: 'Invalid document field.' };
  }

  try {
    const db = await getDb();
    await db.investorCycle.update({
      where: { id: investorCycleId },
      data: { [field]: value },
    });
    revalidatePath('/investors');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function recordContribution(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected.' };
  await requirePermission('RECORD_CONTRIBUTION');

  const investorId = formData.get('investorId') as string;
  const cycleId = formData.get('cycleId') as string;
  const amount = formData.get('amount') as string;
  const dateReceived = formData.get('dateReceived') as string;

  if (!investorId || !cycleId || !amount || !dateReceived) {
    return { ok: false, error: 'Partner, cycle, amount, and date are required.' };
  }

  try {
    const parsedAmount = parseMoneyInput(amount, 'Contribution amount');
    const db = await getDb();
    const contribution = await db.$transaction(async (tx) => {
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
        account: 'Partner capital',
        description: 'Capital placed',
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
  await requirePermission('RECORD_INVESTOR_REPAYMENT');

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
    const repayment = await db.$transaction(async (tx) => {
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
        account: 'Partner capital',
        description: 'Capital returned to partner',
        direction: 'OUT',
        amount: parsedAmountRepaid,
        source: 'InvestorRepayment',
        cycleId,
      });

      return created;
    });
    const investor = await db.investor.findUnique({ where: { id: investorId }, select: { name: true } });
    await notifyInvestorRepayment(investor?.name ?? 'Unknown', parsedAmountRepaid);

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
