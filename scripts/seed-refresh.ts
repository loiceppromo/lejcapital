#!/usr/bin/env npx tsx
/**
 * Seed Refresh Script — resets the database to the canonical seed state.
 *
 * Usage:
 *   npx tsx scripts/seed-refresh.ts
 *
 * This script:
 *  1. Truncates all data tables (preserving schema)
 *  2. Inserts the canonical seed data matching src/lib/platform/seed-data.ts
 *  3. Creates a default FUND_MANAGER user for loiceppromo@gmail.com
 *
 * Requires DATABASE_URL to be set.
 *
 * DESTRUCTIVE — only use in development/staging environments.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { PrismaClient, type LedgerDirection, type SleeveType } from '../src/generated/prisma/client';

config({ path: '.env.local', override: false, quiet: true });
config({ path: '.env', override: false, quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type DeleteManyDelegate = {
  deleteMany: (args?: unknown) => Promise<unknown>;
};

type CountDelegate = {
  count: () => Promise<number>;
};

function hasDeleteMany(model: unknown): model is DeleteManyDelegate {
  return typeof model === 'object' && model !== null && 'deleteMany' in model;
}

function hasCount(model: unknown): model is CountDelegate {
  return typeof model === 'object' && model !== null && 'count' in model;
}

async function main() {
  console.log('LEJ Capital — Seed Refresh');
  console.log('==========================\n');

  // Safety check
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SEED) {
    console.error('ERROR: Refusing to seed in production. Set FORCE_SEED=1 to override.');
    process.exit(1);
  }

  console.log('1/4  Truncating tables...');
  await truncateAll();

  console.log('2/4  Seeding users...');
  await seedUsers();

  console.log('3/4  Seeding fund data...');
  await seedFundData();

  console.log('4/4  Verifying...');
  await verify();

  console.log('\nSeed refresh complete.');
}

async function truncateAll() {
  // Delete in dependency order (children first)
  const tables = [
    'waterfallLine',
    'waterfallRun',
    'reportSnapshot',
    'opportunisticTrigger',
    'ledgerEntry',
    'iCDecision',
    'documentNote',
    'auditLog',
    'notification',
    'engineCycleRecord',
    'operatingEngine',
    'loanRepayment',
    'loanScheduleItem',
    'loan',
    'borrower',
    'marketHolding',
    'investorRepayment',
    'investorContribution',
    'investor',
    'sleeve',
    'cycle',
    'systemConfig',
    'user',
  ];

  for (const table of tables) {
    try {
      const model = prisma[table as keyof typeof prisma];
      if (!hasDeleteMany(model)) {
        console.log(`   Skipped ${table}: deleteMany unavailable`);
        continue;
      }
      await model.deleteMany({});
      console.log(`   Cleared ${table}`);
    } catch (err: unknown) {
      // Table may not exist yet
      const message = err instanceof Error ? err.message : 'unknown error';
      console.log(`   Skipped ${table}: ${message.slice(0, 60)}`);
    }
  }
}

async function seedUsers() {
  await prisma.user.create({
    data: {
      name: 'Loice (Fund Manager)',
      email: 'loiceppromo@gmail.com',
      role: 'FUND_MANAGER',
    },
  });

  // Create two seed investor users
  const investorA = await prisma.user.create({
    data: {
      name: 'Seed Investor A',
      email: 'seed-investor-a@lej.local',
      role: 'INVESTOR',
    },
  });

  const investorB = await prisma.user.create({
    data: {
      name: 'Seed Investor B',
      email: 'seed-investor-b@lej.local',
      role: 'INVESTOR',
    },
  });

  // Create operator user
  await prisma.user.create({
    data: {
      name: 'Seed Operator',
      email: 'seed-operator@lej.local',
      role: 'OPERATOR',
    },
  });

  return { investorA, investorB };
}

async function seedFundData() {
  // --- Cycle ---
  const cycle = await prisma.cycle.create({
    data: {
      sequenceNo: 1,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
      openingNAV: 100000,
      notes: 'Seed cycle for interface verification.',
    },
  });
  console.log(`   Created cycle: ${cycle.id}`);

  // --- Sleeves ---
  const sleeveData: Array<{ type: SleeveType; targetAmount: number; fundedAmount: number }> = [
    { type: 'PROTECTION', targetAmount: 27000, fundedAmount: 27000 },
    { type: 'RESERVE', targetAmount: 15000, fundedAmount: 15000 },
    { type: 'OPERATING_ALPHA', targetAmount: 22000, fundedAmount: 22000 },
    { type: 'MARKET_ALPHA', targetAmount: 18000, fundedAmount: 18000 },
    { type: 'LOAN_BOOK', targetAmount: 18000, fundedAmount: 18000 },
  ];
  for (const sleeve of sleeveData) {
    await prisma.sleeve.create({
      data: { cycleId: cycle.id, ...sleeve },
    });
  }
  console.log('   Created 5 sleeves');

  // --- Investors ---
  const invA = await prisma.investor.create({
    data: {
      name: 'Seed Investor A',
      email: 'seed-investor-a@lej.local',
      status: 'ACTIVE',
    },
  });
  const invB = await prisma.investor.create({
    data: {
      name: 'Seed Investor B',
      email: 'seed-investor-b@lej.local',
      status: 'ACTIVE',
    },
  });

  // --- Contributions ---
  await prisma.investorContribution.create({
    data: {
      investorId: invA.id,
      cycleId: cycle.id,
      amount: 45000,
      dateReceived: new Date('2026-07-01'),
    },
  });
  await prisma.investorContribution.create({
    data: {
      investorId: invB.id,
      cycleId: cycle.id,
      amount: 55000,
      dateReceived: new Date('2026-07-01'),
    },
  });
  console.log('   Created 2 investors, 2 contributions');

  // --- Market Holdings ---
  await prisma.marketHolding.create({
    data: {
      cycleId: cycle.id,
      instrumentType: 'GSE_EQUITY',
      name: 'MTNGH',
      amountInvested: 14000,
      currentValue: 14200,
      returnRate: 0.014286,
      purchaseDate: new Date('2026-07-05'),
    },
  });
  await prisma.marketHolding.create({
    data: {
      cycleId: cycle.id,
      instrumentType: 'TBILL',
      name: '91D T-Bill',
      amountInvested: 18000,
      currentValue: 18486,
      returnRate: 0.027,
      maturityDate: new Date('2026-09-20'),
      purchaseDate: new Date('2026-07-02'),
    },
  });
  await prisma.marketHolding.create({
    data: {
      cycleId: cycle.id,
      instrumentType: 'CASH',
      name: 'Broker cash',
      amountInvested: 4200,
      currentValue: 4200,
      returnRate: 0,
      purchaseDate: new Date('2026-07-01'),
    },
  });
  console.log('   Created 3 market holdings');

  // --- Borrower + Loan ---
  const borrower = await prisma.borrower.create({
    data: {
      name: 'Seed borrower A',
      email: 'seed-borrower-a@lej.local',
      idType: 'NATIONAL_ID',
      idNumber: 'TBC',
      kycStatus: 'VERIFIED',
      riskGrade: 'B',
      notes: 'Seed-mode borrower record for interface verification.',
    },
  });

  await prisma.loan.create({
    data: {
      borrowerId: borrower.id,
      principal: 18000,
      interestRate: 0.05,
      interestMethod: 'FLAT',
      termMonths: 6,
      disbursementDate: new Date('2026-07-10'),
      originationFee: 360,
      originationFeeMethod: 'DEDUCT_FROM_DISBURSEMENT',
      repaymentAllocOrder: 'FEES_INTEREST_PRINCIPAL',
      collateralDesc: 'Inventory pledge',
      collateralValue: 20000,
      status: 'ACTIVE',
      fundingCycleId: cycle.id,
      defaultCutoffDays: 90,
    },
  });
  console.log('   Created 1 borrower, 1 loan');

  // --- Engines ---
  const engineUndc = await prisma.operatingEngine.create({
    data: {
      code: 'UNDC',
      name: 'Undiluted Clothing',
      status: 'ACTIVE',
    },
  });
  const engineAfh = await prisma.operatingEngine.create({
    data: {
      code: 'AFH',
      name: 'African Heritage',
      status: 'VALIDATION',
    },
  });

  await prisma.engineCycleRecord.create({
    data: {
      engineId: engineUndc.id,
      cycleId: cycle.id,
      capitalAllocated: 18700,
      profitReturned: 2500,
      roic: 0.75,
      cashConversion: 0.85,
      sellThrough: 0.70,
      repeatDemand: 0.65,
      operationalRisk: 0.35,
      validationGate: false,
      salesVsTarget: 0.72,
      sellThroughRate: 0.70,
    },
  });
  await prisma.engineCycleRecord.create({
    data: {
      engineId: engineAfh.id,
      cycleId: cycle.id,
      capitalAllocated: 3300,
      validationGate: true,
    },
  });
  console.log('   Created 2 engines, 2 cycle records');

  // --- Opportunistic Trigger ---
  await prisma.opportunisticTrigger.create({
    data: {
      cycleId: cycle.id,
      pcrAbove125: false,
      undcDemandValidated: true,
      undcDemandRationale: 'Sales trend stable',
      marketCatalystDocumented: false,
      marketCatalystRationale: null,
      noOpenOperationalIssues: true,
      operationalOverride: false,
      operationalRationale: null,
    },
  });
  console.log('   Created opportunistic trigger record');

  // --- Ledger entries ---
  const ledgerEntries: Array<{
    date: Date;
    account: string;
    description: string;
    direction: LedgerDirection;
    amount: number;
    source: string;
  }> = [
    { date: new Date('2026-07-01'), account: 'INVESTOR_CAPITAL', description: 'Investor A contribution', direction: 'IN', amount: 45000, source: 'Bank transfer' },
    { date: new Date('2026-07-01'), account: 'INVESTOR_CAPITAL', description: 'Investor B contribution', direction: 'IN', amount: 55000, source: 'Bank transfer' },
    { date: new Date('2026-07-05'), account: 'MARKET_ALPHA', description: 'MTNGH purchase', direction: 'OUT', amount: 14000, source: 'Broker' },
    { date: new Date('2026-07-02'), account: 'MARKET_ALPHA', description: '91D T-Bill purchase', direction: 'OUT', amount: 18000, source: 'Broker' },
    { date: new Date('2026-07-10'), account: 'LOAN_BOOK', description: 'Loan disbursement — Seed borrower A', direction: 'OUT', amount: 17640, source: 'Bank transfer' },
  ];
  for (const entry of ledgerEntries) {
    await prisma.ledgerEntry.create({
      data: { ...entry, cycleId: cycle.id },
    });
  }
  console.log(`   Created ${ledgerEntries.length} ledger entries`);
}

async function verify() {
  const counts: Record<string, number> = {};
  const tables = [
    'user', 'cycle', 'sleeve', 'investor', 'investorContribution',
    'marketHolding', 'borrower', 'loan', 'operatingEngine',
    'engineCycleRecord', 'ledgerEntry', 'opportunisticTrigger',
  ];
  for (const table of tables) {
    const model: unknown = prisma[table as keyof typeof prisma];
    if (!hasCount(model)) {
      throw new Error(`Prisma model ${table} does not support count()`);
    }
    counts[table] = await model.count();
  }
  console.log('\n   Record counts:');
  for (const [table, count] of Object.entries(counts)) {
    console.log(`     ${table}: ${count}`);
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
