-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FUND_MANAGER', 'OPERATOR', 'INVESTOR');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('PLANNING', 'ACTIVE', 'CLOSING', 'CLOSED');

-- CreateEnum
CREATE TYPE "SleeveType" AS ENUM ('PROTECTION', 'OPERATING_ALPHA', 'MARKET_ALPHA', 'RESERVE', 'LOAN_BOOK');

-- CreateEnum
CREATE TYPE "EngineStatus" AS ENUM ('ACTIVE', 'VALIDATION', 'EXITED');

-- CreateEnum
CREATE TYPE "InstrumentType" AS ENUM ('GSE_EQUITY', 'TBILL', 'CASH');

-- CreateEnum
CREATE TYPE "Regime" AS ENUM ('DEFENSIVE', 'NORMAL', 'OPPORTUNISTIC');

-- CreateEnum
CREATE TYPE "ReturnScenario" AS ENUM ('BEAR', 'BASE', 'BULL');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskGrade" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateEnum
CREATE TYPE "InterestMethod" AS ENUM ('FLAT', 'REDUCING_BALANCE');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAID_OFF', 'DEFAULTED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "OriginationFeeMethod" AS ENUM ('DEDUCT_FROM_DISBURSEMENT', 'ADD_TO_BALANCE');

-- CreateEnum
CREATE TYPE "RepaymentAllocOrder" AS ENUM ('FEES_INTEREST_PRINCIPAL', 'FEES_PRINCIPAL_INTEREST', 'PRINCIPAL_INTEREST_FEES');

-- CreateEnum
CREATE TYPE "ScheduleItemStatus" AS ENUM ('SCHEDULED', 'PAID', 'PARTIAL', 'OVERDUE');

-- CreateEnum
CREATE TYPE "DocumentNoteType" AS ENUM ('REGIME_DECISION', 'ALLOCATION_DECISION', 'IC_REVIEW', 'RECONCILIATION', 'GENERAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorContribution" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorRepayment" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "principalDue" DECIMAL(18,2) NOT NULL,
    "amountRepaid" DECIMAL(18,2) NOT NULL,
    "repaymentDate" TIMESTAMP(3) NOT NULL,
    "pcrAtRepayment" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'PLANNING',
    "openingNAV" DECIMAL(18,2),
    "closingNAV" DECIMAL(18,2),
    "retainedCapital" DECIMAL(18,2),
    "regimeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sleeve" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "type" "SleeveType" NOT NULL,
    "targetAmount" DECIMAL(18,2),
    "fundedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "floorAmount" DECIMAL(18,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sleeve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingEngine" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EngineStatus" NOT NULL DEFAULT 'VALIDATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingEngine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineCycleRecord" (
    "id" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "capitalAllocated" DECIMAL(18,2),
    "profitReturned" DECIMAL(18,2),
    "roic" DECIMAL(9,6),
    "cashConversion" DECIMAL(9,6),
    "sellThrough" DECIMAL(9,6),
    "repeatDemand" DECIMAL(9,6),
    "operationalRisk" DECIMAL(9,6),
    "brandScore" DECIMAL(9,6),
    "validationGate" BOOLEAN NOT NULL DEFAULT true,
    "defectRate" DECIMAL(9,6),
    "refundRate" DECIMAL(9,6),
    "productionDelays" INTEGER,
    "salesVsTarget" DECIMAL(9,6),
    "sellThroughRate" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineCycleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketHolding" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "instrumentType" "InstrumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "amountInvested" DECIMAL(18,2) NOT NULL,
    "currentValue" DECIMAL(18,2) NOT NULL,
    "returnRate" DECIMAL(9,6),
    "maturityDate" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketRegimeConfig" (
    "id" TEXT NOT NULL,
    "regime" "Regime" NOT NULL,
    "gsePct" DECIMAL(9,6) NOT NULL,
    "tbillPct" DECIMAL(9,6) NOT NULL,
    "cashPct" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "MarketRegimeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnAssumption" (
    "id" TEXT NOT NULL,
    "instrumentType" "InstrumentType" NOT NULL,
    "scenario" "ReturnScenario" NOT NULL,
    "ratePerCycle" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "ReturnAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunisticTrigger" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "pcrAbove125" BOOLEAN NOT NULL DEFAULT false,
    "undcDemandValidated" BOOLEAN NOT NULL DEFAULT false,
    "undcDemandRationale" TEXT,
    "marketCatalystDocumented" BOOLEAN NOT NULL DEFAULT false,
    "marketCatalystRationale" TEXT,
    "noOpenOperationalIssues" BOOLEAN NOT NULL DEFAULT false,
    "operationalOverride" BOOLEAN NOT NULL DEFAULT false,
    "operationalRationale" TEXT,

    CONSTRAINT "OpportunisticTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterfallRun" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL,
    "totalCashAvailable" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterfallRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterfallLine" (
    "id" TEXT NOT NULL,
    "waterfallRunId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "claimType" TEXT NOT NULL,
    "amountClaimed" DECIMAL(18,2) NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL,
    "fullyPaid" BOOLEAN NOT NULL,
    "cashAfter" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "WaterfallLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Borrower" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "riskGrade" "RiskGrade",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Borrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "fundingCycleId" TEXT,
    "principal" DECIMAL(18,2) NOT NULL,
    "interestRate" DECIMAL(9,6) NOT NULL,
    "interestMethod" "InterestMethod" NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "disbursementDate" TIMESTAMP(3),
    "scheduleType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "originationFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "originationFeeMethod" "OriginationFeeMethod" NOT NULL DEFAULT 'DEDUCT_FROM_DISBURSEMENT',
    "repaymentAllocOrder" "RepaymentAllocOrder" NOT NULL DEFAULT 'FEES_INTEREST_PRINCIPAL',
    "collateralDesc" TEXT,
    "collateralValue" DECIMAL(18,2),
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "provisionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "defaultCutoffDays" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanScheduleItem" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principalDue" DECIMAL(18,2) NOT NULL,
    "interestDue" DECIMAL(18,2) NOT NULL,
    "feesDue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDue" DECIMAL(18,2) NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "ScheduleItemStatus" NOT NULL DEFAULT 'SCHEDULED',
    "daysPastDue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRepayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "scheduleItemId" TEXT,
    "amountReceived" DECIMAL(18,2) NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "allocatedToPrincipal" DECIMAL(18,2) NOT NULL,
    "allocatedToInterest" DECIMAL(18,2) NOT NULL,
    "allocatedToFees" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentNote" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT,
    "type" "DocumentNoteType" NOT NULL,
    "body" TEXT NOT NULL,
    "decision" TEXT,
    "rationale" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_userId_key" ON "Investor"("userId");

-- CreateIndex
CREATE INDEX "InvestorContribution_investorId_idx" ON "InvestorContribution"("investorId");

-- CreateIndex
CREATE INDEX "InvestorContribution_cycleId_idx" ON "InvestorContribution"("cycleId");

-- CreateIndex
CREATE INDEX "InvestorRepayment_investorId_idx" ON "InvestorRepayment"("investorId");

-- CreateIndex
CREATE INDEX "InvestorRepayment_cycleId_idx" ON "InvestorRepayment"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "Cycle_sequenceNo_key" ON "Cycle"("sequenceNo");

-- CreateIndex
CREATE INDEX "Sleeve_cycleId_idx" ON "Sleeve"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "Sleeve_cycleId_type_key" ON "Sleeve"("cycleId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingEngine_code_key" ON "OperatingEngine"("code");

-- CreateIndex
CREATE INDEX "EngineCycleRecord_cycleId_idx" ON "EngineCycleRecord"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "EngineCycleRecord_engineId_cycleId_key" ON "EngineCycleRecord"("engineId", "cycleId");

-- CreateIndex
CREATE INDEX "MarketHolding_cycleId_idx" ON "MarketHolding"("cycleId");

-- CreateIndex
CREATE INDEX "MarketHolding_cycleId_instrumentType_idx" ON "MarketHolding"("cycleId", "instrumentType");

-- CreateIndex
CREATE UNIQUE INDEX "MarketRegimeConfig_regime_key" ON "MarketRegimeConfig"("regime");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnAssumption_instrumentType_scenario_key" ON "ReturnAssumption"("instrumentType", "scenario");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunisticTrigger_cycleId_key" ON "OpportunisticTrigger"("cycleId");

-- CreateIndex
CREATE INDEX "WaterfallRun_cycleId_idx" ON "WaterfallRun"("cycleId");

-- CreateIndex
CREATE INDEX "WaterfallLine_waterfallRunId_idx" ON "WaterfallLine"("waterfallRunId");

-- CreateIndex
CREATE UNIQUE INDEX "WaterfallLine_waterfallRunId_priority_key" ON "WaterfallLine"("waterfallRunId", "priority");

-- CreateIndex
CREATE INDEX "Loan_borrowerId_idx" ON "Loan"("borrowerId");

-- CreateIndex
CREATE INDEX "Loan_fundingCycleId_idx" ON "Loan"("fundingCycleId");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- CreateIndex
CREATE INDEX "LoanScheduleItem_loanId_idx" ON "LoanScheduleItem"("loanId");

-- CreateIndex
CREATE INDEX "LoanScheduleItem_loanId_status_idx" ON "LoanScheduleItem"("loanId", "status");

-- CreateIndex
CREATE INDEX "LoanRepayment_loanId_idx" ON "LoanRepayment"("loanId");

-- CreateIndex
CREATE INDEX "LoanRepayment_scheduleItemId_idx" ON "LoanRepayment"("scheduleItemId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentNote_cycleId_idx" ON "DocumentNote"("cycleId");

-- CreateIndex
CREATE INDEX "DocumentNote_type_idx" ON "DocumentNote"("type");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- AddForeignKey
ALTER TABLE "InvestorContribution" ADD CONSTRAINT "InvestorContribution_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorContribution" ADD CONSTRAINT "InvestorContribution_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorRepayment" ADD CONSTRAINT "InvestorRepayment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorRepayment" ADD CONSTRAINT "InvestorRepayment_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES "MarketRegimeConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sleeve" ADD CONSTRAINT "Sleeve_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineCycleRecord" ADD CONSTRAINT "EngineCycleRecord_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "OperatingEngine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineCycleRecord" ADD CONSTRAINT "EngineCycleRecord_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketHolding" ADD CONSTRAINT "MarketHolding_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunisticTrigger" ADD CONSTRAINT "OpportunisticTrigger_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterfallRun" ADD CONSTRAINT "WaterfallRun_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterfallLine" ADD CONSTRAINT "WaterfallLine_waterfallRunId_fkey" FOREIGN KEY ("waterfallRunId") REFERENCES "WaterfallRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_fundingCycleId_fkey" FOREIGN KEY ("fundingCycleId") REFERENCES "Cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanScheduleItem" ADD CONSTRAINT "LoanScheduleItem_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "LoanScheduleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentNote" ADD CONSTRAINT "DocumentNote_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentNote" ADD CONSTRAINT "DocumentNote_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
