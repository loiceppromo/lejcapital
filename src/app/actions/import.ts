'use server';

import { requirePermission } from '@/lib/auth/server';
import { isDatabaseConfigured, getDb } from '@/lib/db';
import { parseMoneyInput, parseOptionalMoneyInput, parseOptionalRateInput, parseRateInput } from '@/lib/server/financial-inputs';
import type { ImportType } from '@/lib/imports/csv-parser';
import { writeAuditLog } from './audit';

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

          // Get active cycle
          const activeCycle = await db.cycle.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { sequenceNo: 'desc' },
          });

          if (!activeCycle) {
            return { success: false, message: 'No active cycle found. Create a cycle first.' };
          }

          await db.loan.create({
            data: {
              borrowerId: borrower.id,
              principal: parseMoneyInput(row.principal, 'Principal'),
              interestRate: parseRateInput(row.interest_rate, 'Interest rate'),
              interestMethod: 'FLAT',
              termMonths: parseInt(row.term_months, 10),
              disbursementDate: new Date(row.disbursement_date),
              scheduleType: 'MONTHLY',
              originationFee: parseOptionalMoneyInput(row.origination_fee || '', 'Origination fee') ?? '0.00',
              originationFeeMethod: 'DEDUCT_FROM_DISBURSEMENT',
              repaymentAllocOrder: 'FEES_INTEREST_PRINCIPAL',
              collateralDesc: row.collateral_desc || '',
              collateralValue: parseOptionalMoneyInput(row.collateral_value || '', 'Collateral value'),
              status: (row.status as 'ACTIVE' | 'PENDING') || 'ACTIVE',
              fundingCycleId: activeCycle.id,
              provisionAmount: '0.00',
              defaultCutoffDays: 90,
            },
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

        return { success: true, message: `Successfully imported ${created} investor(s).` };
      }

      case 'contributions': {
        let created = 0;
        for (const row of rows) {
          const investor = await db.investor.findFirst({
            where: { name: row.investor_name },
          });
          if (!investor) {
            return { success: false, message: `Investor "${row.investor_name}" not found. Import investors first.` };
          }

          const cycle = await db.cycle.findFirst({
            where: { sequenceNo: parseInt(row.cycle_no, 10) },
          });
          if (!cycle) {
            return { success: false, message: `Cycle ${row.cycle_no} not found.` };
          }

          await db.investorContribution.create({
            data: {
              investorId: investor.id,
              cycleId: cycle.id,
              amount: parseMoneyInput(row.amount, 'Contribution amount'),
              dateReceived: new Date(row.date_received),
            },
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
          await db.marketHolding.create({
            data: {
              cycleId: activeCycle.id,
              instrumentType: row.instrument_type as 'GSE_EQUITY' | 'TBILL' | 'CASH',
              name: row.name,
              amountInvested: parseMoneyInput(row.amount_invested, 'Amount invested'),
              currentValue: parseMoneyInput(row.current_value, 'Current value'),
              returnRate: parseOptionalRateInput(row.return_rate || '', 'Return rate'),
              maturityDate: row.maturity_date ? new Date(row.maturity_date) : null,
              purchaseDate: new Date(row.purchase_date),
            },
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
