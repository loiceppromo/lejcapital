#!/usr/bin/env npx tsx
/**
 * Non-destructive persistence smoke check.
 *
 * Connects to the configured database and prints safe operational counts only.
 * Does not print connection strings, secrets, or row payloads.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('LEJ Capital — Persistence Smoke Check');
  console.log('======================================\n');

  const [
    userCount,
    activeUserCount,
    investorCount,
    cycleCount,
    activeCycle,
    sleeveCount,
    ledgerEntryCount,
    auditLogCount,
    borrowerCount,
    loanCount,
    marketHoldingCount,
    engineCount,
    missingBorrowerIds,
    missingEngineInputs,
    userRoles,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.investor.count(),
    prisma.cycle.count(),
    prisma.cycle.findFirst({ where: { status: 'ACTIVE' }, orderBy: { sequenceNo: 'desc' }, select: { sequenceNo: true, status: true } }),
    prisma.sleeve.count(),
    prisma.ledgerEntry.count(),
    prisma.auditLog.count(),
    prisma.borrower.count(),
    prisma.loan.count(),
    prisma.marketHolding.count(),
    prisma.operatingEngine.count(),
    prisma.borrower.count({ where: { OR: [{ idNumber: null }, { idNumber: 'TBC' }] } }),
    prisma.engineCycleRecord.count({
      where: {
        OR: [
          { roic: null },
          { cashConversion: null },
          { sellThrough: null },
          { repeatDemand: null },
          { operationalRisk: null },
        ],
      },
    }),
    prisma.user.groupBy({ by: ['role'], _count: { role: true }, orderBy: { role: 'asc' } }),
  ]);

  const checks = [
    { label: 'Users', value: userCount, ok: userCount > 0 },
    { label: 'Active users', value: activeUserCount, ok: activeUserCount > 0 },
    { label: 'Investors', value: investorCount, ok: investorCount > 0 },
    { label: 'Cycles', value: cycleCount, ok: cycleCount > 0 },
    { label: 'Sleeves', value: sleeveCount, ok: sleeveCount > 0 },
    { label: 'Ledger entries', value: ledgerEntryCount, ok: ledgerEntryCount > 0 },
    { label: 'Audit logs', value: auditLogCount, ok: auditLogCount > 0 },
    { label: 'Borrowers', value: borrowerCount, ok: true },
    { label: 'Loans', value: loanCount, ok: true },
    { label: 'Market holdings', value: marketHoldingCount, ok: true },
    { label: 'Operating engines', value: engineCount, ok: engineCount > 0 },
  ];

  console.log('Core counts:');
  for (const check of checks) {
    console.log(`  ${check.ok ? '✓' : '!'} ${check.label.padEnd(18)} ${check.value}`);
  }

  console.log('\nUser roles:');
  for (const role of userRoles) {
    console.log(`  ${role.role.padEnd(14)} ${role._count.role}`);
  }

  console.log('\nCurrent operating state:');
  console.log(`  Active cycle: ${activeCycle ? `Cycle ${activeCycle.sequenceNo} (${activeCycle.status})` : 'none'}`);
  console.log(`  Borrowers with missing ID number: ${missingBorrowerIds}`);
  console.log(`  Engine records with TBC score inputs: ${missingEngineInputs}`);

  const blocking = checks.filter((check) => !check.ok).map((check) => check.label);
  if (blocking.length > 0) {
    console.log(`\nResult: WATCH — missing expected records: ${blocking.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nResult: OK — database is reachable and core records are present.');
}

main()
  .catch((err) => {
    console.error('Persistence smoke check failed:', err instanceof Error ? err.message : 'Unknown error');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
