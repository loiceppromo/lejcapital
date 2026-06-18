import { Decimal } from '@/lib/finance';
import type { LedgerEntry } from '@/lib/platform/types';

// ─── Account categories ───

export const LEDGER_ACCOUNTS = [
  'Partner capital',
  'Protection sleeve',
  'Reserve sleeve',
  'Operating Alpha',
  'Market Alpha',
  'Loan book',
  'GSE equity',
  'T-Bill',
  'Cash',
  'Engine profit',
  'Loan interest',
  'Loan principal repayment',
  'Origination fees',
  'Supplier payment',
  'Tax payment',
  'Customer refund',
  'Emergency production',
  'Operating expense',
  'Other',
] as const;

export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];

export const MANUAL_LEDGER_DESTINATIONS = ['Businesses', 'T-Bills', 'Stocks'] as const;

export const LEDGER_SOURCES = [
  'InvestorContribution',
  'InvestorRepayment',
  'SleeveAllocation',
  'MarketTrade',
  'Loan',
  'LoanRepayment',
  'EngineReturn',
  'WaterfallDistribution',
  'Manual',
] as const;

export type LedgerSource = (typeof LEDGER_SOURCES)[number];

// ─── Validation ───

export interface LedgerEntryInput {
  date: string;
  account: string;
  description: string;
  direction: 'IN' | 'OUT';
  amount: string; // string to validate before converting
  source: string;
  cycleId?: string | null;
}

export interface LedgerValidationError {
  field: string;
  message: string;
}

export function validateLedgerEntry(input: LedgerEntryInput): LedgerValidationError[] {
  const errors: LedgerValidationError[] = [];

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.push({ field: 'date', message: 'Date is required (YYYY-MM-DD).' });
  } else {
    const d = new Date(input.date);
    if (isNaN(d.getTime())) {
      errors.push({ field: 'date', message: 'Invalid date.' });
    }
  }

  if (!input.account.trim()) {
    errors.push({ field: 'account', message: 'Account is required.' });
  }

  if (!input.description.trim()) {
    errors.push({ field: 'description', message: 'Description is required.' });
  }

  if (input.direction !== 'IN' && input.direction !== 'OUT') {
    errors.push({ field: 'direction', message: 'Direction must be IN or OUT.' });
  }

  if (!input.amount.trim()) {
    errors.push({ field: 'amount', message: 'Amount is required.' });
  } else {
    try {
      const dec = new Decimal(input.amount);
      if (dec.lte(0)) {
        errors.push({ field: 'amount', message: 'Amount must be positive.' });
      }
    } catch {
      errors.push({ field: 'amount', message: 'Amount must be a valid number.' });
    }
  }

  if (!input.source.trim()) {
    errors.push({ field: 'source', message: 'Source is required.' });
  }

  return errors;
}

export function createLedgerEntry(
  input: LedgerEntryInput,
  existingEntries: LedgerEntry[],
): LedgerEntry {
  const errors = validateLedgerEntry(input);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.map((e) => e.message).join('; ')}`);
  }

  const id = `ledger-${existingEntries.length + 1}-${Date.now()}`;

  return {
    id,
    date: input.date,
    account: input.account,
    description: input.description.trim(),
    direction: input.direction,
    amount: new Decimal(input.amount),
    source: input.source,
    cycleId: input.cycleId ?? null,
  };
}

// ─── Summaries ───

export function summarizeByAccount(
  entries: LedgerEntry[],
): Array<{ account: string; totalIn: Decimal; totalOut: Decimal; net: Decimal; count: number }> {
  const map = new Map<string, { totalIn: Decimal; totalOut: Decimal; count: number }>();

  for (const entry of entries) {
    const current = map.get(entry.account) ?? {
      totalIn: new Decimal(0),
      totalOut: new Decimal(0),
      count: 0,
    };
    if (entry.direction === 'IN') {
      current.totalIn = current.totalIn.plus(entry.amount);
    } else {
      current.totalOut = current.totalOut.plus(entry.amount);
    }
    current.count += 1;
    map.set(entry.account, current);
  }

  return Array.from(map.entries())
    .map(([account, data]) => ({
      account,
      totalIn: data.totalIn,
      totalOut: data.totalOut,
      net: data.totalIn.minus(data.totalOut),
      count: data.count,
    }))
    .sort((a, b) => b.net.minus(a.net).toNumber());
}

export function filterEntries(
  entries: LedgerEntry[],
  filters: {
    account?: string;
    direction?: 'IN' | 'OUT';
    source?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  },
): LedgerEntry[] {
  return entries.filter((entry) => {
    if (filters.account && entry.account !== filters.account) return false;
    if (filters.direction && entry.direction !== filters.direction) return false;
    if (filters.source && entry.source !== filters.source) return false;
    if (filters.dateFrom && entry.date < filters.dateFrom) return false;
    if (filters.dateTo && entry.date > filters.dateTo) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !entry.description.toLowerCase().includes(q) &&
        !entry.account.toLowerCase().includes(q) &&
        !entry.source.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}

export function computeRunningBalance(entries: LedgerEntry[]): Array<LedgerEntry & { runningBalance: Decimal }> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let balance = new Decimal(0);

  return sorted.map((entry) => {
    if (entry.direction === 'IN') {
      balance = balance.plus(entry.amount);
    } else {
      balance = balance.minus(entry.amount);
    }
    return { ...entry, runningBalance: balance };
  });
}
