import { describe, it, expect } from 'vitest';
import { findInvestorByEmail, scopeToInvestor } from '../fund/investor-lookup';
import type { InvestorRecord } from '../fund/investors';

const investors: InvestorRecord[] = [
  { id: 'inv-1', name: 'Alice', contact: 'alice@example.com', status: 'ACTIVE' },
  { id: 'inv-2', name: 'Bob', contact: 'bob@example.com', status: 'ACTIVE' },
  { id: 'inv-3', name: 'Charlie', contact: '', status: 'INACTIVE' },
];

describe('findInvestorByEmail', () => {
  it('finds an investor by exact email match', () => {
    const result = findInvestorByEmail(investors, 'alice@example.com');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('inv-1');
  });

  it('is case-insensitive', () => {
    const result = findInvestorByEmail(investors, 'BOB@EXAMPLE.COM');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('inv-2');
  });

  it('trims whitespace', () => {
    const result = findInvestorByEmail(investors, '  alice@example.com  ');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('inv-1');
  });

  it('returns null for null email', () => {
    expect(findInvestorByEmail(investors, null)).toBeNull();
  });

  it('returns null for undefined email', () => {
    expect(findInvestorByEmail(investors, undefined)).toBeNull();
  });

  it('returns null for empty email', () => {
    expect(findInvestorByEmail(investors, '')).toBeNull();
  });

  it('returns null when no investor matches', () => {
    expect(findInvestorByEmail(investors, 'nobody@example.com')).toBeNull();
  });
});

describe('scopeToInvestor', () => {
  const records = [
    { investorId: 'inv-1', amount: 100 },
    { investorId: 'inv-2', amount: 200 },
    { investorId: 'inv-1', amount: 300 },
    { investorId: 'inv-3', amount: 50 },
  ];

  it('returns all records when investorId is null (admin view)', () => {
    const result = scopeToInvestor(records, null);
    expect(result).toHaveLength(4);
  });

  it('filters to a specific investor', () => {
    const result = scopeToInvestor(records, 'inv-1');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.investorId === 'inv-1')).toBe(true);
  });

  it('returns empty array for unmatched investor', () => {
    const result = scopeToInvestor(records, 'inv-999');
    expect(result).toHaveLength(0);
  });
});
