import { Decimal } from '@/lib/finance';
import { isDatabaseConfigured, getDb } from '@/lib/db';
import { getPlatformState } from '@/lib/platform/selectors';
import { LedgerPageClient, type SerializedLedgerEntry } from './ledger-client';

async function loadLedgerEntries(): Promise<SerializedLedgerEntry[]> {
  let entries;

  if (!isDatabaseConfigured()) {
    entries = getPlatformState().ledgerEntries;
  } else {
    try {
      const db = await getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await (db as any).ledgerEntry.findMany({ orderBy: { date: 'asc' } });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entries = (rows as any[]).map((r) => ({
        id: r.id as string,
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
        account: r.account as string,
        description: r.description as string,
        direction: r.direction as 'IN' | 'OUT',
        amount: new Decimal(String(r.amount)),
        source: (r.source as string) ?? 'Manual',
      }));
    } catch {
      entries = getPlatformState().ledgerEntries;
    }
  }

  // Serialize Decimal → string so client component can hydrate
  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    account: e.account,
    description: e.description,
    direction: e.direction,
    amount: e.amount.toString(),
    source: e.source,
  }));
}

export default async function LedgerPage() {
  const entries = await loadLedgerEntries();
  const dbConnected = isDatabaseConfigured();

  return <LedgerPageClient initialEntries={entries} dbConnected={dbConnected} />;
}
