/**
 * Data layer — reads from Supabase Postgres when configured, falls back to seed data.
 *
 * Maps Prisma model shapes into the PlatformState interface so all selectors
 * and finance engine functions continue to work unchanged.
 */
import { Decimal, generateSchedule } from '@/lib/finance';
import { isDatabaseConfigured, getDb } from '@/lib/db';
import { platformState as seedState } from '@/lib/platform/seed-data';
import { SYNTHETIC_EMPTY_CYCLE_ID } from '@/lib/platform/cycle-utils';
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

    // Parallel fetch all tables
    const [
      dbCycles,
      dbSleeves,
      dbInvestors,
      dbContributions,
      dbRepayments,
      dbHoldings,
      dbMarketTrades,
      dbBorrowers,
      dbLoans,
      dbScheduleItems,
      dbLoanRepayments,
      dbEngines,
      dbEngineRecords,
      dbAuditLogs,
      dbDocNotes,
      dbICDecisions,
      dbLedgerEntries,
      dbWaterfallRuns,
      dbOpportunisticTriggers,
      dbReportSnapshots,
      dbLegacyReportSnapshots,
      dbInvestorCycles,
    ] = await Promise.all([
      db.cycle.findMany({ orderBy: { sequenceNo: 'asc' }, include: { regime: true } }),
      db.sleeve.findMany(),
      db.investor.findMany({ orderBy: { name: 'asc' } }),
      db.investorContribution.findMany({ orderBy: { dateReceived: 'desc' } }),
      db.investorRepayment.findMany({ orderBy: { repaymentDate: 'desc' } }),
      db.marketHolding.findMany({ orderBy: { purchaseDate: 'desc' } }),
      db.marketTrade.findMany({ orderBy: [{ tradeDate: 'desc' }, { createdAt: 'desc' }] }),
      db.borrower.findMany({ orderBy: { name: 'asc' } }),
      db.loan.findMany({ orderBy: { createdAt: 'desc' } }),
      db.loanScheduleItem.findMany({ orderBy: [{ loanId: 'asc' }, { dueDate: 'asc' }] }),
      db.loanRepayment.findMany({ orderBy: { dateReceived: 'desc' } }),
      db.operatingEngine.findMany(),
      db.engineCycleRecord.findMany(),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      db.documentNote.findMany({ where: { type: 'IC_REVIEW' }, orderBy: { createdAt: 'desc' } }),
      db.iCDecision.findMany({ orderBy: { createdAt: 'desc' } }),
      db.ledgerEntry.findMany({ orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] }),
      db.waterfallRun.findMany({
        orderBy: { runDate: 'desc' },
        include: { lines: { orderBy: { priority: 'asc' } } },
      }),
      db.opportunisticTrigger.findMany(),
      db.reportSnapshot.findMany({ orderBy: { createdAt: 'desc' } }),
      db.systemConfig.findMany({
        where: { key: { startsWith: 'report-snapshot:' } },
        orderBy: { updatedAt: 'desc' },
      }),
      db.investorCycle.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    // --- Map cycles ---
    const cycles = dbCycles.map((c) => ({
      id: c.id as string,
      sequenceNo: c.sequenceNo as number,
      startDate: dateStr(c.startDate),
      endDate: dateStr(c.endDate),
      status: c.status as PlatformState['cycles'][0]['status'],
      openingNAV: decOrNull(c.openingNAV),
      closingNAV: decOrNull(c.closingNAV),
      retainedCapital: decOrNull(c.retainedCapital),
      regime: c.regime?.regime ?? null,
      notes: (c.notes as string) ?? '',
    }));

    // Empty (e.g. freshly reset) database: synthesize a single zero-value
    // PLANNING cycle so selectors that assume an active cycle never crash.
    // Crucially we do NOT early-return here — the rest of this function still
    // maps the real cycle-independent data (businesses, borrowers, loans,
    // ledger entries) so newly added records show up before any cycle exists.
    if (cycles.length === 0) {
      const today = new Date();
      const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      cycles.push({
        id: SYNTHETIC_EMPTY_CYCLE_ID,
        sequenceNo: 1,
        startDate: dateStr(today),
        endDate: dateStr(ninetyDays),
        status: 'PLANNING',
        openingNAV: new Decimal(0),
        closingNAV: null,
        retainedCapital: null,
        regime: null,
        notes: '',
      });
    }

    // Active cycle = latest ACTIVE, or latest cycle
    const activeCycle = cycles.find((c) => c.status === 'ACTIVE') ?? cycles[cycles.length - 1];

    // --- Map sleeves ---
    const sleevesByCycle: PlatformState['sleevesByCycle'] = {};
    for (const s of dbSleeves) {
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
    const investors = dbInvestors.map((i) => ({
      id: i.id as string,
      name: i.name as string,
      contact: (i.email as string) ?? (i.phone as string) ?? '',
      status: (i.status as string) === 'ACTIVE' ? 'ACTIVE' as const : 'INACTIVE' as const,
      email: i.email,
      phone: i.phone,
      notes: i.notes,
      riskNotes: i.riskNotes,
    }));

    // --- Map contributions ---
    const contributions = dbContributions.map((c) => ({
      id: c.id as string,
      investorId: c.investorId as string,
      cycleId: c.cycleId as string,
      amount: dec(c.amount),
      dateReceived: dateStr(c.dateReceived),
    }));

    // --- Map repayments ---
    const repayments = dbRepayments.map((r) => ({
      id: r.id as string,
      investorId: r.investorId as string,
      cycleId: r.cycleId as string,
      principalDue: dec(r.principalDue),
      amountRepaid: dec(r.amountRepaid),
      repaymentDate: dateStr(r.repaymentDate),
      pcrAtRepayment: decOrNull(r.pcrAtRepayment),
    }));

    // --- Map market holdings ---
    const marketHoldings = dbHoldings.map((h) => ({
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

    // --- Map market trades ---
    const marketTrades = dbMarketTrades.map((trade) => ({
      id: trade.id as string,
      cycleId: trade.cycleId as string,
      holdingId: (trade.holdingId as string) ?? null,
      instrumentType: trade.instrumentType as PlatformState['marketTrades'][0]['instrumentType'],
      side: trade.side as PlatformState['marketTrades'][0]['side'],
      name: trade.name as string,
      quantity: decOrNull(trade.quantity),
      price: decOrNull(trade.price),
      grossAmount: dec(trade.grossAmount),
      fees: dec(trade.fees),
      netAmount: dec(trade.netAmount),
      tradeDate: dateStr(trade.tradeDate),
      executionVenue: (trade.executionVenue as string) ?? null,
      notes: (trade.notes as string) ?? null,
      createdAt: dateTimeStr(trade.createdAt),
    }));

    // --- Map borrowers ---
    const borrowers = dbBorrowers.map((b) => ({
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
    const loans = dbLoans.map((l) => ({
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
    let loanSchedules = dbScheduleItems.map((item, idx) => ({
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
    const loanRepaymentsMapped = dbLoanRepayments.map((r) => ({
      id: r.id as string,
      loanId: r.loanId as string,
      scheduleItemId: (r.scheduleItemId as string) ?? null,
      amountReceived: dec(r.amountReceived),
      dateReceived: dateStr(r.dateReceived),
      allocatedToPrincipal: dec(r.allocatedToPrincipal),
      allocatedToInterest: dec(r.allocatedToInterest),
      allocatedToFees: dec(r.allocatedToFees),
    }));

    // --- Map engines (standalone businesses) ---
    const engines = dbEngines.map((e) => ({
      id: e.id as string,
      code: e.code as string,
      name: e.name as string,
      description: (e.description as string) ?? null,
      logoUrl: (e.logoUrl as string) ?? null,
      status: (e.status as 'ACTIVE' | 'VALIDATION' | 'EXITED') ?? 'VALIDATION',
    }));

    // --- Map engine records (join engine + cycle record) ---
    const engineMap = new Map(dbEngines.map((e) => [e.id, e]));
    const engineRecords = dbEngineRecords.map((r) => {
      const engine = engineMap.get(r.engineId);
      return {
        id: r.id as string,
        engineId: r.engineId as string,
        cycleId: r.cycleId as string,
        code: (engine?.code as string) ?? 'UNK',
        name: (engine?.name as string) ?? 'Unknown',
        description: (engine?.description as string) ?? null,
        logoUrl: (engine?.logoUrl as string) ?? null,
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
    const auditEntries = dbAuditLogs.map((a) => ({
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
    const legacyIcDecisions = dbDocNotes.map((n) => ({
      id: n.id as string,
      cycleId: (n.cycleId as string) ?? '',
      position: (n.body as string) ?? '',
      decision: (n.decision as 'INCREASE' | 'MAINTAIN' | 'REDUCE' | 'EXIT') ?? 'MAINTAIN',
      rationale: (n.rationale as string) ?? (n.body as string) ?? '',
      createdAt: dateTimeStr(n.createdAt),
    }));
    const dedicatedIcDecisions = dbICDecisions.map((n) => ({
      id: n.id as string,
      cycleId: n.cycleId as string,
      position: n.topic as string,
      decision: n.resolution as 'INCREASE' | 'MAINTAIN' | 'REDUCE' | 'EXIT',
      rationale: Array.isArray(n.attendees) ? String(n.attendees[0] ?? '') : '',
      createdAt: dateTimeStr(n.createdAt),
    }));
    const icDecisions = [...dedicatedIcDecisions, ...legacyIcDecisions];

    // --- Map ledger entries ---
    const ledgerEntries = dbLedgerEntries.map((entry) => ({
      id: entry.id as string,
      date: dateStr(entry.date),
      account: entry.account as string,
      description: entry.description as string,
      direction: entry.direction as 'IN' | 'OUT',
      amount: dec(entry.amount),
      source: (entry.source as string) ?? 'Manual',
      cycleId: (entry.cycleId as string) ?? null,
    }));

    // --- Map waterfall runs ---
    const waterfallRuns = dbWaterfallRuns.map((run) => ({
      id: run.id as string,
      cycleId: run.cycleId as string,
      runDate: dateStr(run.runDate),
      totalCashAvailable: dec(run.totalCashAvailable),
      lines: run.lines.map((line) => ({
        id: line.id as string,
        waterfallRunId: line.waterfallRunId as string,
        priority: line.priority as number,
        claimType: line.claimType as string,
        amountClaimed: dec(line.amountClaimed),
        amountPaid: dec(line.amountPaid),
        fullyPaid: line.fullyPaid as boolean,
        cashAfter: dec(line.cashAfter),
      })),
    }));

    // --- Map opportunistic triggers ---
    const opportunisticTriggers = dbOpportunisticTriggers.map((trigger) => ({
      cycleId: trigger.cycleId as string,
      pcrAbove125: trigger.pcrAbove125 as boolean,
      undcDemandValidated: trigger.undcDemandValidated as boolean,
      undcDemandRationale: (trigger.undcDemandRationale as string) ?? null,
      marketCatalystDocumented: trigger.marketCatalystDocumented as boolean,
      marketCatalystRationale: (trigger.marketCatalystRationale as string) ?? null,
      noOpenOperationalIssues: trigger.noOpenOperationalIssues as boolean,
      operationalOverride: trigger.operationalOverride as boolean,
      operationalRationale: (trigger.operationalRationale as string) ?? null,
    }));

    // --- Map report snapshots ---
    const dedicatedReportSnapshots = dbReportSnapshots.map((snapshot) => {
      const value = snapshot.data as Record<string, unknown>;
      return {
        id: snapshot.id as string,
        key: snapshot.label as string,
        snapshotDate: snapshot.snapshotDate as string,
        createdAt: dateTimeStr(snapshot.createdAt),
        activeCycle: String(value.activeCycle ?? ''),
        cycleStatus: String(value.cycleStatus ?? ''),
        currentNAV: String(value.currentNAV ?? ''),
        pcr: String(value.pcr ?? ''),
        pcrStatus: String(value.pcrStatus ?? ''),
        investorPrincipalDue: String(value.investorPrincipalDue ?? ''),
        netLoanBookValue: String(value.netLoanBookValue ?? ''),
        totalProvisions: String(value.totalProvisions ?? ''),
        marketPortfolioValue: String(value.marketPortfolioValue ?? ''),
        riskBreaches: Number(value.riskBreaches ?? 0),
      };
    });
    const legacyReportSnapshots = dbLegacyReportSnapshots.map((snapshot) => {
      const value = snapshot.value as Record<string, unknown>;
      return {
        id: snapshot.id as string,
        key: snapshot.key as string,
        snapshotDate: String(value.snapshotDate ?? ''),
        createdAt: String(value.createdAt ?? dateTimeStr(snapshot.updatedAt)),
        activeCycle: String(value.activeCycle ?? ''),
        cycleStatus: String(value.cycleStatus ?? ''),
        currentNAV: String(value.currentNAV ?? ''),
        pcr: String(value.pcr ?? ''),
        pcrStatus: String(value.pcrStatus ?? ''),
        investorPrincipalDue: String(value.investorPrincipalDue ?? ''),
        netLoanBookValue: String(value.netLoanBookValue ?? ''),
        totalProvisions: String(value.totalProvisions ?? ''),
        marketPortfolioValue: String(value.marketPortfolioValue ?? ''),
        riskBreaches: Number(value.riskBreaches ?? 0),
      };
    });
    const reportSnapshots = [...dedicatedReportSnapshots, ...legacyReportSnapshots];

    // --- Map investor cycles ---
    const investorCycles = dbInvestorCycles.map((ic) => ({
      id: ic.id as string,
      investorId: ic.investorId as string,
      cycleId: ic.cycleId as string,
      investmentAmount: dec(ic.investmentAmount),
      packageTier: ic.packageTier as string,
      cycleReturnRate: dec(ic.cycleReturnRate),
      preferredReturn: dec(ic.preferredReturn),
      finalPayout: dec(ic.finalPayout),
      cycleStartDate: dateStr(ic.cycleStartDate),
      cycleEndDate: dateStr(ic.cycleEndDate),
      status: ic.status as 'ACTIVE' | 'MATURED' | 'PAID_OUT' | 'REINVESTED',
      payoutPreference: (ic.payoutPreference as string) ?? null,
      reinvestmentAmount: decOrNull(ic.reinvestmentAmount),
      cashPayoutAmount: decOrNull(ic.cashPayoutAmount),
      reinvestmentConfirmed: ic.reinvestmentConfirmed as boolean,
      reinvestmentDate: ic.reinvestmentDate ? dateStr(ic.reinvestmentDate) : null,
      previousCycleId: (ic.previousCycleId as string) ?? null,
      nextCycleId: (ic.nextCycleId as string) ?? null,
      giftEligible: ic.giftEligible as boolean,
      giftTier: ic.giftTier as string,
      giftStatus: ic.giftStatus as string,
      giftSelected: (ic.giftSelected as string) ?? null,
      giftDeliveryDate: ic.giftDeliveryDate ? dateStr(ic.giftDeliveryDate) : null,
      giftNotes: (ic.giftNotes as string) ?? null,
      agreementUploaded: ic.agreementUploaded as boolean,
      riskAckSigned: ic.riskAckSigned as boolean,
      proofOfPayment: ic.proofOfPayment as boolean,
      documentNotes: (ic.documentNotes as string) ?? null,
    }));

    return {
      mode: 'SEED', // Keep compatible — reads still use same selectors
      activeCycleId: activeCycle.id,
      requestedRegime: activeCycle.regime ?? 'NORMAL',
      cycles,
      sleevesByCycle,
      investors,
      contributions,
      repayments,
      marketHoldings,
      marketTrades,
      borrowers,
      loans,
      loanSchedules,
      loanRepayments: loanRepaymentsMapped,
      engines,
      engineRecords,
      auditEntries,
      icDecisions,
      ledgerEntries,
      waterfallRuns,
      opportunisticTriggers,
      reportSnapshots,
      investorCycles,
    };
  } catch (err) {
    console.error('DB read failed:', err);
    throw err;
  }
}
