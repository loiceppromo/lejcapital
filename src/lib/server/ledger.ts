import { validateLedgerEntry } from '@/lib/fund/ledger';
import { parsePositiveMoneyInput } from './financial-inputs';
import type { PrismaClient } from '@/generated/prisma/client';

type LedgerDirection = 'IN' | 'OUT';

interface LedgerRecordInput {
  date: Date | string;
  account: string;
  description: string;
  direction: LedgerDirection;
  amount: string;
  source: string;
  cycleId?: string | null;
}

function formatLedgerDate(date: Date | string): string {
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return date.slice(0, 10);
}

export async function createLedgerEntryRecord(
  dbOrTx: Pick<PrismaClient, 'ledgerEntry'>,
  input: LedgerRecordInput,
) {
  const date = formatLedgerDate(input.date);
  const amount = parsePositiveMoneyInput(input.amount, 'Ledger amount');
  const errors = validateLedgerEntry({
    date,
    account: input.account,
    description: input.description,
    direction: input.direction,
    amount,
    source: input.source,
    cycleId: input.cycleId ?? null,
  });

  if (errors.length > 0) {
    throw new Error(errors.map((err) => err.message).join(' '));
  }

  return dbOrTx.ledgerEntry.create({
    data: {
      date: new Date(date),
      account: input.account,
      description: input.description,
      direction: input.direction,
      amount,
      source: input.source,
      cycleId: input.cycleId ?? null,
    },
  });
}
