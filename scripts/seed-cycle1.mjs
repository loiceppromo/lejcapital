#!/usr/bin/env node
/**
 * Seed Cycle 1 into the real Supabase database.
 *
 * Creates: 1 cycle, 5 sleeves, 2 investors, 2 contributions,
 * 3 market holdings, 1 borrower, 1 loan, 2 engines + cycle records.
 *
 * Safe to run multiple times — checks for existing data first.
 *
 * Usage: node scripts/seed-cycle1.mjs
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import pg from 'pg';
const { Client } = pg;

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL or DIRECT_URL in .env.local'); process.exit(1); }

const client = new Client({ connectionString: url });
await client.connect();

// Check if cycle-1 already exists
const existing = await client.query("SELECT id FROM \"Cycle\" WHERE \"sequenceNo\" = 1");
if (existing.rows.length > 0) {
  console.log('Cycle 1 already exists — skipping seed.');
  await client.end();
  process.exit(0);
}

console.log('Seeding Cycle 1...');

// --- Cycle ---
const cycleId = 'cycle-1';
await client.query(`
  INSERT INTO "Cycle" (id, "sequenceNo", "startDate", "endDate", status, "openingNAV", "createdAt", "updatedAt")
  VALUES ($1, 1, '2026-07-01', '2026-09-30', 'ACTIVE', 100000, NOW(), NOW())
`, [cycleId]);
console.log('  ✓ Cycle 1');

// --- Sleeves ---
const sleeves = [
  ['PROTECTION', 125000, 65000, null],
  ['RESERVE', 7500, 7500, 7500],
  ['OPERATING_ALPHA', 14500, 14500, null],
  ['MARKET_ALPHA', 40000, 22000, null],
  ['LOAN_BOOK', 18000, 18000, null],
];
for (const [type, target, funded, floor] of sleeves) {
  await client.query(`
    INSERT INTO "Sleeve" (id, "cycleId", type, "targetAmount", "fundedAmount", "floorAmount", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
  `, [cycleId, type, target, funded, floor]);
}
console.log('  ✓ 5 sleeves');

// --- Investors ---
const inv1 = 'investor-1', inv2 = 'investor-2';
await client.query(`INSERT INTO "Investor" (id, name, email, status, "createdAt", "updatedAt") VALUES ($1, 'Investor A', 'investor-a@lejcapital.com', 'ACTIVE', NOW(), NOW())`, [inv1]);
await client.query(`INSERT INTO "Investor" (id, name, email, status, "createdAt", "updatedAt") VALUES ($1, 'Investor B', 'investor-b@lejcapital.com', 'ACTIVE', NOW(), NOW())`, [inv2]);
console.log('  ✓ 2 investors');

// --- Contributions ---
await client.query(`INSERT INTO "InvestorContribution" (id, "investorId", "cycleId", amount, "dateReceived", "createdAt") VALUES (gen_random_uuid(), $1, $2, 45000, '2026-07-01', NOW())`, [inv1, cycleId]);
await client.query(`INSERT INTO "InvestorContribution" (id, "investorId", "cycleId", amount, "dateReceived", "createdAt") VALUES (gen_random_uuid(), $1, $2, 55000, '2026-07-01', NOW())`, [inv2, cycleId]);
console.log('  ✓ 2 contributions (GHS 100,000 total)');

// --- Market Holdings ---
await client.query(`INSERT INTO "MarketHolding" (id, "cycleId", "instrumentType", name, "amountInvested", "currentValue", "returnRate", "purchaseDate", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, 'GSE_EQUITY', 'MTNGH', 14000, 14200, 0.014286, '2026-07-05', NOW(), NOW())`, [cycleId]);
await client.query(`INSERT INTO "MarketHolding" (id, "cycleId", "instrumentType", name, "amountInvested", "currentValue", "returnRate", "maturityDate", "purchaseDate", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, 'TBILL', '91D T-Bill', 18000, 18486, 0.027, '2026-09-20', '2026-07-02', NOW(), NOW())`, [cycleId]);
await client.query(`INSERT INTO "MarketHolding" (id, "cycleId", "instrumentType", name, "amountInvested", "currentValue", "returnRate", "purchaseDate", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, 'CASH', 'Broker cash', 4200, 4200, 0, '2026-07-01', NOW(), NOW())`, [cycleId]);
console.log('  ✓ 3 market holdings');

// --- Borrower + Loan ---
const borrowerId = 'borrower-1';
await client.query(`INSERT INTO "Borrower" (id, name, email, "idType", "idNumber", "kycStatus", "riskGrade", notes, "createdAt", "updatedAt") VALUES ($1, 'Borrower A', 'borrower-a@example.com', 'NATIONAL_ID', 'GHA-2026-0001', 'VERIFIED', 'B', 'First borrower', NOW(), NOW())`, [borrowerId]);
await client.query(`
  INSERT INTO "Loan" (id, "borrowerId", "fundingCycleId", principal, "interestRate", "interestMethod", "termMonths", "disbursementDate", "originationFee", "originationFeeMethod", "repaymentAllocOrder", "collateralDesc", "collateralValue", status, "provisionAmount", "defaultCutoffDays", "createdAt", "updatedAt")
  VALUES ('loan-1', $1, $2, 18000, 0.30, 'REDUCING_BALANCE', 6, '2026-07-10', 450, 'DEDUCT_FROM_DISBURSEMENT', 'FEES_INTEREST_PRINCIPAL', 'Inventory pledge', 12000, 'ACTIVE', 180, 90, NOW(), NOW())
`, [borrowerId, cycleId]);
console.log('  ✓ 1 borrower + 1 loan');

// --- Engines + Cycle Records ---
const eng1 = 'engine-undc', eng2 = 'engine-afh';
await client.query(`INSERT INTO "OperatingEngine" (id, code, name, status, "createdAt", "updatedAt") VALUES ($1, 'UNDC', 'UNDC', 'ACTIVE', NOW(), NOW())`, [eng1]);
await client.query(`INSERT INTO "OperatingEngine" (id, code, name, status, "createdAt", "updatedAt") VALUES ($1, 'AFH', 'AFH', 'VALIDATION', NOW(), NOW())`, [eng2]);

await client.query(`
  INSERT INTO "EngineCycleRecord" (id, "engineId", "cycleId", roic, "cashConversion", "sellThrough", "repeatDemand", "operationalRisk", "validationGate", "defectRate", "refundRate", "productionDelays", "salesVsTarget", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), $1, $2, 0.78, 0.86, 0.82, 0.74, 0.42, false, 0.02, 0.01, 1, 0.88, NOW(), NOW())
`, [eng1, cycleId]);
await client.query(`
  INSERT INTO "EngineCycleRecord" (id, "engineId", "cycleId", "validationGate", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW())
`, [eng2, cycleId]);
console.log('  ✓ 2 engines + cycle records');

// --- Audit entries ---
await client.query(`INSERT INTO "AuditLog" (id, action, "entityType", "entityId", after, "createdAt") VALUES (gen_random_uuid(), 'SYSTEM_BOOTSTRAP', 'APPLICATION', 'lej-capital-management', '{"event":"Database seeded with Cycle 1"}', NOW())`);
await client.query(`INSERT INTO "AuditLog" (id, action, "entityType", "entityId", after, "createdAt") VALUES (gen_random_uuid(), 'SIZE_SLEEVES', 'Sleeve', $1, '{"event":"Seed sleeve structure sized"}', NOW())`, [cycleId]);
console.log('  ✓ 2 audit entries');

await client.end();
console.log('\nDone! All pages now read from the real database.');
