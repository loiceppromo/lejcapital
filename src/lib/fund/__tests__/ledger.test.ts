import { describe, it, expect } from 'vitest';
import { Decimal } from '@/lib/finance';
import {
  validateLedgerEntry,
  createLedgerEntry,
  summarizeByAccount,
  filterEntries,
  computeRunningBalance,
  type LedgerEntryInput,
} from '../ledger';
import type { LedgerEntry } from '@/lib/platform/types';

function d(v: string | number) {
  return new Decimal(v);
}

function makeEntry(overrides: Partial<LedgerEntry> & { id: string }): LedgerEntry {
  return {
    date: '2026-07-01',
    account: 'Investor capital',
    description: 'Test entry',
    direction: 'IN',
    amount: d(1000),
    source: 'Manual',
    ...overrides,
  };
}

describe('validateLedgerEntry', () => {
  const validInput: LedgerEntryInput = {
    date: '2026-07-15',
    account: 'Investor capital',
    description: 'Contribution received',
    direction: 'IN',
    amount: '50000',
    source: 'InvestorContribution',
  };

  it('returns no errors for valid input', () => {
    expect(validateLedgerEntry(validInput)).toHaveLength(0);
  });

  it('rejects empty date', () => {
    const errors = validateLedgerEntry({ ...validInput, date: '' });
    expect(errors.some((e) => e.field === 'date')).toBe(true);
  });

  it('rejects malformed date', () => {
    const errors = validateLedgerEntry({ ...validInput, date: '15-07-2026' });
    expect(errors.some((e) => e.field === 'date')).toBe(true);
  });

  it('rejects empty account', () => {
    const errors = validateLedgerEntry({ ...validInput, account: '' });
    expect(errors.some((e) => e.field === 'account')).toBe(true);
  });

  it('rejects empty description', () => {
    const errors = validateLedgerEntry({ ...validInput, description: '   ' });
    expect(errors.some((e) => e.field === 'description')).toBe(true);
  });

  it('rejects invalid direction', () => {
    const errors = validateLedgerEntry({ ...validInput, direction: 'UP' as 'IN' | 'OUT' });
    expect(errors.some((e) => e.field === 'direction')).toBe(true);
  });

  it('rejects zero amount', () => {
    const errors = validateLedgerEntry({ ...validInput, amount: '0' });
    expect(errors.some((e) => e.field === 'amount')).toBe(true);
  });

  it('rejects negative amount', () => {
    const errors = validateLedgerEntry({ ...validInput, amount: '-500' });
    expect(errors.some((e) => e.field === 'amount')).toBe(true);
  });

  it('rejects non-numeric amount', () => {
    const errors = validateLedgerEntry({ ...validInput, amount: 'abc' });
    expect(errors.some((e) => e.field === 'amount')).toBe(true);
  });

  it('rejects empty source', () => {
    const errors = validateLedgerEntry({ ...validInput, source: '' });
    expect(errors.some((e) => e.field === 'source')).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const errors = validateLedgerEntry({
      date: '',
      account: '',
      description: '',
      direction: '' as 'IN',
      amount: '',
      source: '',
    });
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });
});

describe('createLedgerEntry', () => {
  it('creates a valid ledger entry', () => {
    const entry = createLedgerEntry(
      {
        date: '2026-07-15',
        account: 'Investor capital',
        description: 'Contribution from Investor A',
        direction: 'IN',
        amount: '45000',
        source: 'InvestorContribution',
      },
      [],
    );

    expect(entry.id).toBeTruthy();
    expect(entry.date).toBe('2026-07-15');
    expect(entry.account).toBe('Investor capital');
    expect(entry.amount.toFixed(2)).toBe('45000.00');
    expect(entry.direction).toBe('IN');
  });

  it('throws on invalid input', () => {
    expect(() =>
      createLedgerEntry(
        { date: '', account: '', description: '', direction: 'IN', amount: '0', source: '' },
        [],
      ),
    ).toThrow('Validation failed');
  });

  it('trims description whitespace', () => {
    const entry = createLedgerEntry(
      {
        date: '2026-07-15',
        account: 'Cash',
        description: '  Broker deposit  ',
        direction: 'IN',
        amount: '5000',
        source: 'Manual',
      },
      [],
    );
    expect(entry.description).toBe('Broker deposit');
  });
});

describe('summarizeByAccount', () => {
  it('groups entries by account with totals', () => {
    const entries: LedgerEntry[] = [
      makeEntry({ id: '1', account: 'Investor capital', direction: 'IN', amount: d(45000) }),
      makeEntry({ id: '2', account: 'Investor capital', direction: 'IN', amount: d(55000) }),
      makeEntry({ id: '3', account: 'Loan book', direction: 'OUT', amount: d(18000) }),
      makeEntry({ id: '4', account: 'Loan interest', direction: 'IN', amount: d(1200) }),
    ];

    const summary = summarizeByAccount(entries);
    expect(summary).toHaveLength(3);

    const investor = summary.find((s) => s.account === 'Investor capital');
    expect(investor!.totalIn.toFixed(2)).toBe('100000.00');
    expect(investor!.totalOut.toFixed(2)).toBe('0.00');
    expect(investor!.net.toFixed(2)).toBe('100000.00');
    expect(investor!.count).toBe(2);

    const loan = summary.find((s) => s.account === 'Loan book');
    expect(loan!.totalOut.toFixed(2)).toBe('18000.00');
    expect(loan!.net.toFixed(2)).toBe('-18000.00');
  });

  it('returns empty array for no entries', () => {
    expect(summarizeByAccount([])).toHaveLength(0);
  });
});

describe('filterEntries', () => {
  const entries: LedgerEntry[] = [
    makeEntry({ id: '1', date: '2026-07-01', account: 'Investor capital', direction: 'IN', source: 'InvestorContribution' }),
    makeEntry({ id: '2', date: '2026-07-10', account: 'Loan book', direction: 'OUT', source: 'Loan' }),
    makeEntry({ id: '3', date: '2026-07-15', account: 'Loan interest', direction: 'IN', source: 'LoanRepayment', description: 'Monthly interest' }),
    makeEntry({ id: '4', date: '2026-08-01', account: 'Investor capital', direction: 'IN', source: 'InvestorContribution' }),
  ];

  it('filters by account', () => {
    const result = filterEntries(entries, { account: 'Investor capital' });
    expect(result).toHaveLength(2);
  });

  it('filters by direction', () => {
    const result = filterEntries(entries, { direction: 'OUT' });
    expect(result).toHaveLength(1);
    expect(result[0].account).toBe('Loan book');
  });

  it('filters by source', () => {
    const result = filterEntries(entries, { source: 'LoanRepayment' });
    expect(result).toHaveLength(1);
  });

  it('filters by date range', () => {
    const result = filterEntries(entries, { dateFrom: '2026-07-10', dateTo: '2026-07-15' });
    expect(result).toHaveLength(2);
  });

  it('filters by search text', () => {
    const result = filterEntries(entries, { search: 'monthly' });
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Monthly interest');
  });

  it('combines filters', () => {
    const result = filterEntries(entries, { account: 'Investor capital', dateFrom: '2026-08-01' });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-08-01');
  });

  it('returns all when no filters', () => {
    expect(filterEntries(entries, {})).toHaveLength(4);
  });
});

describe('computeRunningBalance', () => {
  it('computes running balance sorted by date', () => {
    const entries: LedgerEntry[] = [
      makeEntry({ id: '2', date: '2026-07-10', direction: 'OUT', amount: d(18000) }),
      makeEntry({ id: '1', date: '2026-07-01', direction: 'IN', amount: d(100000) }),
      makeEntry({ id: '3', date: '2026-07-15', direction: 'IN', amount: d(5000) }),
    ];

    const result = computeRunningBalance(entries);
    expect(result[0].date).toBe('2026-07-01');
    expect(result[0].runningBalance.toFixed(2)).toBe('100000.00');
    expect(result[1].date).toBe('2026-07-10');
    expect(result[1].runningBalance.toFixed(2)).toBe('82000.00');
    expect(result[2].date).toBe('2026-07-15');
    expect(result[2].runningBalance.toFixed(2)).toBe('87000.00');
  });

  it('handles empty entries', () => {
    expect(computeRunningBalance([])).toHaveLength(0);
  });
});
