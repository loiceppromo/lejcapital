/**
 * Data layer — reads from Supabase Postgres when configured, falls back to seed data.
 *
 * Maps Prisma model shapes into the PlatformState interface so all selectors
 * and finance engine functions continue to work unchanged.
 */
import { Decimal, generateSchedule } from '@/lib/finance';
import { isDatabaseConfigured, getDb } from '@/lib/db';
import { platformState as seedState } from '@/lib/platform/seed-data';
import type { PlatformState } from '@/lib/platform/types';

/** Convert Prisma Decimal or number to decimal.js Decimal, null-safe */
function dec(value: unknown): Decimal {
  if (value == null) return new Decimal(0);
  return new Decimal(String(value));
}
function decOrNull(value: unknown): Decimal | null {
  if (value == null) return null;
  return new Decimal(String(value));
}
function dateStr(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return '';
}
function dateTimeStr(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return '';
}

/**
 * Load the full platform state. Called by every page.
 * - DB configured → reads all tables, maps to PlatformState
 * - DB not configured → returns in-memory seed data
 */
export async function loadPlatformState(): Promise<PlatformState> {
  if (!isDatabaseConfigured()) return seedState;

  try {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = db as any;

    // Parallel fetch all tables
    const [
      dbCycles,
      dbSleeves,
      dbInvestors,
      dbContributions,
      dbRepayments,
      dbHoldings,
      dbBorrowers,
      dbLoans,
      dbScheduleItems,
      dbLoanRepayments,
      dbEngines,
      dbEngineRecords,
      dbAuditLogs,
      dbDocNotes,
      dbLedgerEntries,
    ] = await Promise.all([
      prisma.cycle.findMany({ orderBy: { sequenceNo: 'asc' } }),
      prisma.sleeve.findMany(),
      prisma.investor.findMany({ orderBy: { name: 'asc' } }),
      prisma.investorContribution.findMany({ orderBy: { dateReceived: 'desc' } }),
      prisma.investorRepayment.findMany({ orderBy: { repaymentDate: 'desc' } }),
      prisma.marketHolding.findMany({ orderBy: { purchaseDate: 'desc' } }),
      prisma.borrower.findMany({ orderBy: { name: 'asc' } }),
      prisma.loan.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.loanScheduleItem.findMany({ orderBy: [{ loanId: 'asc' }, { dueDate: 'asc' }] }),
      prisma.loanRepayment.findMany({ orderBy: { dateReceived: 'desc' } }),
      prisma.operatingEngine.findMany(),
      prisma.engineCycleRecord.findMany(),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.documentNote.findMany({ where: { type: 'IC_REVIEW' }, orderBy: { createdAt: 'desc' } }),
      prisma.ledgerEntry.findMany({ orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] }),
    ]);

    // If DB has no cycles yet, fall back to seed data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((dbCycles as any[]).length === 0) return seedState;

    // --- Map cycles ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cycles = (dbCycles as any[]).map((c) => ({
      id: c.id as string,
      sequenceNo: c.sequenceNo as number,
      startDate: dateStr(c.startDate),
      endDate: dateStr(c.endDate),
      status: c.status as PlatformState['cycles'][0]['status'],
      openingNAV: decOrNull(c.openingNAV),
      closingNAV: decOrNull(c.closingNAV),
      retainedCapital: decOrNull(c.retainedCapital),
      notes: (c.notes as string) ?? '',
    }));

    // Active cycle = latest ACTIVE, or latest cycle
    const activeCycle = cycles.find((c) => c.status === 'ACTIVE') ?? cycles[cycles.length - 1];

    // --- Map sleeves ---
    const sleevesByCycle: PlatformState['sleevesByCycle'] = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of dbSleeves as any[]) {
      const cid = s.cycleId as string;
      if (!sleevesByCycle[cid]) sleevesByCycle[cid] = [];
      sleevesByCycle[cid].push({
        type: s.type,
        targetAmount: decOrNull(s.targetAmount),
        fundedAmount: dec(s.fundedAmount),
        floorAmount: decOrNull(s.floorAmount),
        notes: (s.notes as string) ?? '',
      });
    }

    // --- Map investors ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const investors = (dbInvestors as any[]).map((i) => ({
      id: i.id as string,
      name: i.name as string,
      contact: (i.email as string) ?? (i.phone as string) ?? '',
      status: (i.status as string) === 'ACTIVE' ? 'ACTIVE' as const : 'INACTIVE' as const,
    }));

    // --- Map contributions ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contributions = (dbContributions as any[]).map((c) => ({
      id: c.id as string,
      investorId: c.investorId as string,
      cycleId: c.cycleId as string,
      amount: dec(c.amount),
      dateReceived: dateStr(c.dateReceived),
    }));

    // --- Map repayments ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repayments = (dbRepayments as any[]).map((r) => ({
      id: r.id as string,
      investorId: r.investorId as string,
      cycleId: r.cycleId as string,
      principalDue: dec(r.principalDue),
      amountRepaid: dec(r.amountRepaid),
      repaymentDate: dateStr(r.repaymentDate),
      pcrAtRepayment: decOrNull(r.pcrAtRepayment),
    }));

    // --- Map market holdings ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marketHoldings = (dbHoldings as any[]).map((h) => ({
      id: h.id as string,
      cycleId: h.cycleId as string,
      instrumentType: h.instrumentType as PlatformState['marketHoldings'][0]['instrumentType'],
      name: h.name as string,
      amountInvested: dec(h.amountInvested),
      currentValue: dec(h.currentValue),
      returnRate: decOrNull(h.returnRate),
      maturityDate: h.maturityDate ? dateStr(h.maturityDate) : null,
      purchaseDate: dateStr(h.purchaseDate),
    }));

    // --- Map borrowers ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const borrowers = (dbBorrowers as any[]).map((b) => ({
      id: b.id as string,
      name: b.name as string,
      contact: (b.email as string) ?? (b.phone as string) ?? '',
      idType: (b.idType as string) ?? 'TBC',
      idNumber: (b.idNumber as string) ?? 'TBC',
      kycStatus: (b.kycStatus as 'PENDING' | 'VERIFIED' | 'REJECTED') ?? 'PENDING',
      riskGrade: (b.riskGrade as 'A' | 'B' | 'C' | 'D' | 'E') ?? 'C',
      notes: (b.notes as string) ?? '',
    }));

    // --- Map loans ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loans = (dbLoans as any[]).map((l) => ({
      id: l.id as string,
      borrowerId: l.borrowerId as string,
      principal: dec(l.principal),
      interestRate: dec(l.interestRate),
      interestMethod: l.interestMethod as 'FLAT' | 'REDUCING_BALANCE',
      termMonths: l.termMonths as number,
      disbursementDate: dateStr(l.disbursementDate ?? l.createdAt),
      scheduleType: 'MONTHLY' as const,
      originationFee: dec(l.originationFee),
      originationFeeMethod: l.originationFeeMethod as 'DEDUCT_FROM_DISBURSEMENT' | 'ADD_TO_BALANCE',
      repaymentAllocOrder: l.repaymentAllocOrder as 'FEES_INTEREST_PRINCIPAL' | 'FEES_PRINCIPAL_INTEREST' | 'PRINCIPAL_INTEREST_FEES',
      collateralDesc: (l.collateralDesc as string) ?? '',
      collateralValue: decOrNull(l.collateralValue),
      status: l.status as 'PENDING' | 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED' | 'WRITTEN_OFF',
      fundingCycleId: (l.fundingCycleId as string) ?? activeCycle.id,
      provisionAmount: dec(l.provisionAmount),
      defaultCutoffDays: (l.defaultCutoffDays as number) ?? 90,
    }));

    // --- Map or generate loan schedules ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let loanSchedules = (dbScheduleItems as any[]).map((item, idx) => ({
      id: item.id as string,
      loanId: item.loanId as string,
      period: idx + 1,
      dueDate: dateStr(item.dueDate),
      principalDue: dec(item.principalDue),
      interestDue: dec(item.interestDue),
      feesDue: dec(item.feesDue),
      totalDue: dec(item.totalDue),
      amountPaid: dec(item.amountPaid),
      status: item.status as 'SCHEDULED' | 'PAID' | 'PARTIAL' | 'OVERDUE',
      daysPastDue: (item.daysPastDue as number) ?? 0,
    }));

    // For loans with no DB schedules, generate from the finance engine
    const loansWithSchedules = new Set(loanSchedules.map((s) => s.loanId));
    for (const loan of loans) {
      if (!loansWithSchedules.has(loan.id) && loan.disbursementDate && loan.status !== 'PENDING') {
        const generated = generateSchedule({
          principal: loan.principal,
          annualRate: loan.interestRate,
          termMonths: loan.termMonths,
          method: loan.interestMethod,
          disbursementDate: new Date(loan.disbursementDate),
        });
        const now = new Date();
        loanSchedules = loanSchedules.concat(
          generated.map((item) => {
            const dpd = Math.max(0, Math.floor((now.getTime() - item.dueDate.getTime()) / 86400000));
            return {
              id: `${loan.id}-gen-${item.period}`,
              loanId: loan.id,
              period: item.period,
              dueDate: dateStr(item.dueDate),
              principalDue: item.principalDue,
              interestDue: item.interestDue,
              feesDue: new Decimal(0),
              totalDue: item.totalDue,
              amountPaid: new Decimal(0),
              status: dpd > 0 ? 'OVERDUE' as const : 'SCHEDULED' as const,
              daysPastDue: dpd,
            };
          }),
        );
      }
    }

    // --- Map loan repayments ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loanRepaymentsMapped = (dbLoanRepayments as any[]).map((r) => ({
      id: r.id as string,
      loanId: r.loanId as string,
      scheduleItemId: (r.scheduleItemId as string) ?? null,
      amountReceived: dec(r.amountReceived),
      dateReceived: dateStr(r.dateReceived),
      allocatedToPrincipal: dec(r.allocatedToPrincipal),
      allocatedToInterest: dec(r.allocatedToInterest),
      allocatedToFees: dec(r.allocatedToFees),
    }));

    // --- Map engine records (join engine + cycle record) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engineMap = new Map((dbEngines as any[]).map((e) => [e.id, e]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engineRecords = (dbEngineRecords as any[]).map((r) => {
      const engine = engineMap.get(r.engineId);
      return {
        id: r.id as string,
        cycleId: r.cycleId as string,
        code: (engine?.code as string) ?? 'UNK',
        name: (engine?.name as string) ?? 'Unknown',
        status: (engine?.status as 'ACTIVE' | 'VALIDATION' | 'EXITED') ?? 'VALIDATION',
        capitalAllocated: decOrNull(r.capitalAllocated),
        profitReturned: decOrNull(r.profitReturned),
        roic: decOrNull(r.roic),
        cashConversion: decOrNull(r.cashConversion),
        sellThrough: decOrNull(r.sellThrough),
        repeatDemand: decOrNull(r.repeatDemand),
        operationalRisk: decOrNull(r.operationalRisk),
        validationGate: (r.validationGate as boolean) ?? true,
        defectRate: decOrNull(r.defectRate),
        refundRate: decOrNull(r.refundRate),
        productionDelays: (r.productionDelays as number) ?? null,
        salesVsTarget: decOrNull(r.salesVsTarget),
        sellThroughRate: decOrNull(r.sellThroughRate),
      };
    });

    // --- Map audit entries ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auditEntries = (dbAuditLogs as any[]).map((a) => ({
      id: a.id as string,
      actorId: (a.actorId as string) ?? 'system',
      action: a.action as string,
      entityType: a.entityType as string,
      entityId: a.entityId as string,
      before: a.before ? JSON.stringify(a.before) : 'TBC',
      after: a.after ? JSON.stringify(a.after) : 'TBC',
      createdAt: dateTimeStr(a.createdAt),
    }));

    // --- Map IC decisions from document notes ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const icDecisions = (dbDocNotes as any[]).map((n) => ({
      id: n.id as string,
      cycleId: (n.cycleId as string) ?? '',
      position: (n.decision as string) ?? '',
      decision: 'MAINTAIN' as const,
      rationale: (n.rationale as string) ?? (n.body as string) ?? '',
      createdAt: dateTimeStr(n.createdAt),
    }));

    // --- Map ledger entries ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ledgerEntries = (dbLedgerEntries as any[]).map((entry) => ({
      id: entry.id as string,
      date: dateStr(entry.date),
      account: entry.account as string,
      description: entry.description as string,
      direction: entry.direction as 'IN' | 'OUT',
      amount: dec(entry.amount),
      source: (entry.source as string) ?? 'Manual',
      cycleId: (entry.cycleId as string) ?? null,
    }));

    return {
      mode: 'SEED', // Keep compatible — reads still use same selectors
      activeCycleId: activeCycle.id,
      requestedRegime: 'NORMAL',
      cycles,
      sleevesByCycle,
      investors,
      contributions,
      repayments,
      marketHoldings,
      borrowers,
      loans,
      loanSchedules,
      loanRepayments: loanRepaymentsMapped,
      engineRecords,
      auditEntries,
      icDecisions,
      ledgerEntries,
    };
  } catch (err) {
    console.error('DB read failed, falling back to seed data:', err);
    return seedState;
  }
}
