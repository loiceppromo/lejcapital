import { Decimal } from '@/lib/finance';
import { isDatabaseConfigured } from '@/lib/db';
import { loadPlatformState } from '@/lib/data/queries';
import { guardPage } from '@/lib/auth/page-guard';
import { LedgerPageClient, type SerializedLedgerEntry } from './ledger-client';

function serializeLedgerEntries(entries: Array<{
  id: string;
  date: string;
  account: string;
  description: string;
  direction: 'IN' | 'OUT';
  amount: Decimal;
  source: string;
  cycleId?: string | null;
}>): SerializedLedgerEntry[] {
  // Serialize Decimal → string so client component can hydrate
  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    account: e.account,
    description: e.description,
    direction: e.direction,
    amount: e.amount.toString(),
    source: e.source,
    cycleId: e.cycleId ?? null,
  }));
}

export default async function LedgerPage() {
  await guardPage('/ledger');
  const state = await loadPlatformState();
  const entries = serializeLedgerEntries(state.ledgerEntries);
  const dbConnected = isDatabaseConfigured();
  const activeCycleId = state.activeCycleId;

  return <LedgerPageClient initialEntries={entries} dbConnected={dbConnected} activeCycleId={activeCycleId} />;
}
