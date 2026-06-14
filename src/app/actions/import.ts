'use server';

import { requirePermission } from '@/lib/auth/server';
import { isDatabaseConfigured, getDb } from '@/lib/db';
import { parseMoneyInput, parseOptionalMoneyInput, parseOptionalRateInput, parseRateInput } from '@/lib/server/financial-inputs';
import { createLedgerEntryRecord } from '@/lib/server/ledger';
import { Decimal, generateSchedule, type InterestMethod } from '@/lib/finance';
import type { ImportType } from '@/lib/imports/csv-parser';
import { writeAuditLog } from './audit';

const marketAccountByInstrument: Record<string, string> = {
  GSE_EQUITY: 'GSE equity',
  TBILL: 'T-Bill',
  CASH: 'Cash',
};

export async function importCsvData(
  type: ImportType,
  rows: Record<string, string>[],
): Promise<{ success: boolean; message: string }> {
  await requirePermission('MANAGE_SETTINGS');

  if (!isDatabaseConfigured()) {
    return { success: false, message: 'Database not configured. Import requires a connected database.' };
  }

  if (rows.length === 0) {
    return { success: false, message: 'No rows to import.' };
  }

  if (rows.length > 1000) {
    return { success: false, message: 'Maximum 1000 rows per import. Please split your file.' };
  }

  try {
    const db = await getDb();

    switch (type) {
      case 'loans': {
        let created = 0;
        const activeCycle = await db.cycle.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { sequenceNo: 'desc' },
        });

        if (!activeCycle) {
          return { success: false, message: 'No active cycle found. Create a cycle first.' };
        }

        for (const row of rows) {
          // Find or create borrower
          let borrower = await db.borrower.findFirst({
            where: { name: row.borrower_name },
          });
          if (!borrower) {
            const contact = row.contact ?? '';
            borrower = await db.borrower.create({
              data: {
                name: row.borrower_name,
                email: contact.includes('@') ? contact : null,
                phone: contact && !contact.includes('@') ? contact : null,
                idType: 'NATIONAL_ID',
                idNumber: 'TBC',
                kycStatus: 'PENDING',
                riskGrade: 'C',
                notes: 'Created via CSV import',
              },
            });
          }

          const principal = parseMoneyInput(row.principal, 'Principal');
          const interestRate = parseRateInput(row.interest_rate, 'Interest rate');
          const termMonths = parseInt(row.term_months, 10);
          const disbursementDate = new Date(row.disbursement_date);
          const originationFee = parseOptionalMoneyInput(row.origination_fee || '', 'Origination fee') ?? '0.00';
          const status = row.status === 'PENDING' ? 'PENDING' : 'ACTIVE';
          const schedule = status === 'ACTIVE'
            ? generateSchedule({
                principal: new Decimal(principal),
                annualRate: new Decimal(interestRate),
                termMonths,
                method: 'FLAT' as InterestMethod,
                disbursementDate,
              })
            : [];

          await db.$transaction(async (tx) => {
            const loan = await tx.loan.create({
              data: {
                borrowerId: borrower.id,
                principal,
                interestRate,
                interestMethod: 'FLAT',
                termMonths,
                disbursementDate,
                scheduleType: 'MONTHLY',
                originationFee,
                originationFeeMethod: 'DEDUCT_FROM_DISBURSEMENT',
                repaymentAllocOrder: 'FEES_INTEREST_PRINCIPAL',
                collateralDesc: row.collateral_desc || '',
                collateralValue: parseOptionalMoneyInput(row.collateral_value || '', 'Collateral value'),
                status,
                fundingCycleId: activeCycle.id,
                provisionAmount: '0.00',
                defaultCutoffDays: 90,
              },
            });

            if (schedule.length > 0) {
              await tx.loanScheduleItem.createMany({
                data: schedule.map((item) => ({
                  loanId: loan.id,
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
            }

            if (status === 'ACTIVE') {
              await createLedgerEntryRecord(tx as Parameters<typeof createLedgerEntryRecord>[0], {
                date: disbursementDate,
                account: 'Loan book',
                description: `CSV loan disbursed: ${loan.id}`,
                direction: 'OUT',
                amount: principal,
                source: 'Loan',
                cycleId: activeCycle.id,
              });

              if (new Decimal(originationFee).gt(0)) {
                await createLedgerEntryRecord(tx as Parameters<typeof createLedgerEntryRecord>[0], {
                  date: disbursementDate,
                  account: 'Origination fees',
                  description: `CSV origination fee retained: ${loan.id}`,
                  direction: 'IN',
                  amount: originationFee,
                  source: 'Loan',
                  cycleId: activeCycle.id,
                });
              }
            }
          });
          created++;
        }

        await writeAuditLog('BULK_IMPORT_LOANS', 'Loan', 'bulk', { count: created });

        return { success: true, message: `Successfully imported ${created} loan(s).` };
      }

      case 'investors': {
        let created = 0;
        for (const row of rows) {
          const contact = row.contact ?? '';
          await db.investor.create({
            data: {
              name: row.name,
              email: contact.includes('@') ? contact : null,
              phone: contact && !contact.includes('@') ? contact : null,
            },
          });
          created++;
        }

        await writeAuditLog('BULK_IMPORT_INVESTORS', 'Investor', 'bulk', { count: created });

        return { success: true, message: `Successfully imported ${created} capital partner(s).` };
      }

      case 'contributions': {
        let created = 0;
        for (const row of rows) {
          const investor = await db.investor.findFirst({
            where: { name: row.investor_name },
          });
          if (!investor) {
            return { success: false, message: `Partner "${row.investor_name}" not found. Import capital partners first.` };
          }

          const cycle = await db.cycle.findFirst({
            where: { sequenceNo: parseInt(row.cycle_no, 10) },
          });
          if (!cycle) {
            return { success: false, message: `Cycle ${row.cycle_no} not found.` };
          }

          const amount = parseMoneyInput(row.amount, 'Contribution amount');
          await db.$transaction(async (tx) => {
            await tx.investorContribution.create({
              data: {
                investorId: investor.id,
                cycleId: cycle.id,
                amount,
                dateReceived: new Date(row.date_received),
              },
            });

            await createLedgerEntryRecord(tx as Parameters<typeof createLedgerEntryRecord>[0], {
              date: row.date_received,
              account: 'Partner capital',
              description: 'CSV capital contribution received',
              direction: 'IN',
              amount,
              source: 'InvestorContribution',
              cycleId: cycle.id,
            });
          });
          created++;
        }

        await writeAuditLog('BULK_IMPORT_CONTRIBUTIONS', 'InvestorContribution', 'bulk', { count: created });

        return { success: true, message: `Successfully imported ${created} contribution(s).` };
      }

      case 'market_holdings': {
        let created = 0;
        const activeCycle = await db.cycle.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { sequenceNo: 'desc' },
        });

        if (!activeCycle) {
          return { success: false, message: 'No active cycle found. Create a cycle first.' };
        }

        for (const row of rows) {
          const amountInvested = parseMoneyInput(row.amount_invested, 'Amount invested');
          const instrumentType = row.instrument_type as 'GSE_EQUITY' | 'TBILL' | 'CASH';
          await db.$transaction(async (tx) => {
            await tx.marketHolding.create({
              data: {
                cycleId: activeCycle.id,
                instrumentType,
                name: row.name,
                amountInvested,
                currentValue: parseMoneyInput(row.current_value, 'Current value'),
                returnRate: parseOptionalRateInput(row.return_rate || '', 'Return rate'),
                maturityDate: row.maturity_date ? new Date(row.maturity_date) : null,
                purchaseDate: new Date(row.purchase_date),
              },
            });

            await createLedgerEntryRecord(tx as Parameters<typeof createLedgerEntryRecord>[0], {
              date: row.purchase_date,
              account: marketAccountByInstrument[instrumentType] ?? 'Market Alpha',
              description: `CSV market holding added: ${row.name}`,
              direction: 'OUT',
              amount: amountInvested,
              source: 'MarketTrade',
              cycleId: activeCycle.id,
            });
          });
          created++;
        }

        await writeAuditLog('BULK_IMPORT_MARKET_HOLDINGS', 'MarketHolding', 'bulk', { count: created });

        return { success: true, message: `Successfully imported ${created} market holding(s).` };
      }

      default:
        return { success: false, message: `Import type "${type}" is not supported.` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message: `Import failed: ${message}` };
  }
}
