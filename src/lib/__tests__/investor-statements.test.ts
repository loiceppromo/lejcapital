import { describe, it, expect } from 'vitest';
import {
  buildInvestorStatement,
  investorPrincipalDueForCycle,
  totalInvestorPrincipalDue,
  type InvestorRecord,
  type InvestorContributionRecord,
  type InvestorRepaymentRecord,
} from '../fund/investors';
import { Decimal } from '../finance';

function d(v: string | number) {
  return new Decimal(v);
}

const investorA: InvestorRecord = {
  id: 'inv-1',
  name: 'Alice',
  contact: 'alice@example.com',
  status: 'ACTIVE',
};

const investorB: InvestorRecord = {
  id: 'inv-2',
  name: 'Bob',
  contact: 'bob@example.com',
  status: 'ACTIVE',
};

const contributions: InvestorContributionRecord[] = [
  { id: 'c1', investorId: 'inv-1', cycleId: 'cycle-1', amount: d(45000), dateReceived: '2026-07-01' },
  { id: 'c2', investorId: 'inv-2', cycleId: 'cycle-1', amount: d(55000), dateReceived: '2026-07-01' },
  { id: 'c3', investorId: 'inv-1', cycleId: 'cycle-2', amount: d(30000), dateReceived: '2027-01-01' },
];

const repayments: InvestorRepaymentRecord[] = [
  { id: 'r1', investorId: 'inv-1', cycleId: 'cycle-1', principalDue: d(45000), amountRepaid: d(45000), repaymentDate: '2026-12-15', pcrAtRepayment: d('1.18') },
  { id: 'r2', investorId: 'inv-2', cycleId: 'cycle-1', principalDue: d(55000), amountRepaid: d(30000), repaymentDate: '2026-12-15', pcrAtRepayment: d('1.18') },
];

describe('investorPrincipalDueForCycle', () => {
  it('sums contributions for a specific investor and cycle', () => {
    const result = investorPrincipalDueForCycle('inv-1', 'cycle-1', contributions);
    expect(result.toFixed(2)).toBe('45000.00');
  });

  it('returns zero for an investor with no contributions in cycle', () => {
    const result = investorPrincipalDueForCycle('inv-2', 'cycle-2', contributions);
    expect(result.toFixed(2)).toBe('0.00');
  });

  it('returns zero for unknown investor', () => {
    const result = investorPrincipalDueForCycle('inv-999', 'cycle-1', contributions);
    expect(result.toFixed(2)).toBe('0.00');
  });
});

describe('totalInvestorPrincipalDue', () => {
  it('sums all contributions for a cycle across all investors', () => {
    const result = totalInvestorPrincipalDue('cycle-1', contributions);
    expect(result.toFixed(2)).toBe('100000.00');
  });

  it('includes only the target cycle', () => {
    const result = totalInvestorPrincipalDue('cycle-2', contributions);
    expect(result.toFixed(2)).toBe('30000.00');
  });

  it('returns zero for a cycle with no contributions', () => {
    const result = totalInvestorPrincipalDue('cycle-99', contributions);
    expect(result.toFixed(2)).toBe('0.00');
  });
});

describe('buildInvestorStatement', () => {
  it('builds a complete statement for investor with contributions and repayments', () => {
    const stmt = buildInvestorStatement(investorA, contributions, repayments);

    expect(stmt.investor.id).toBe('inv-1');
    expect(stmt.totalContributed.toFixed(2)).toBe('75000.00'); // 45000 + 30000
    expect(stmt.totalRepaid.toFixed(2)).toBe('45000.00');
    expect(stmt.currentStanding.toFixed(2)).toBe('30000.00'); // 75000 - 45000

    // Should have 2 cycles
    expect(stmt.cycles).toHaveLength(2);

    // Cycle 1
    const c1 = stmt.cycles.find((c) => c.cycleId === 'cycle-1')!;
    expect(c1.contributed.toFixed(2)).toBe('45000.00');
    expect(c1.repaid.toFixed(2)).toBe('45000.00');
    expect(c1.pcrAtRepayment?.toFixed(2)).toBe('1.18');

    // Cycle 2 — no repayments yet
    const c2 = stmt.cycles.find((c) => c.cycleId === 'cycle-2')!;
    expect(c2.contributed.toFixed(2)).toBe('30000.00');
    expect(c2.repaid.toFixed(2)).toBe('0.00');
    expect(c2.pcrAtRepayment).toBeNull();
  });

  it('builds statement for partially repaid investor', () => {
    const stmt = buildInvestorStatement(investorB, contributions, repayments);

    expect(stmt.totalContributed.toFixed(2)).toBe('55000.00');
    expect(stmt.totalRepaid.toFixed(2)).toBe('30000.00');
    expect(stmt.currentStanding.toFixed(2)).toBe('25000.00');
    expect(stmt.cycles).toHaveLength(1);
  });

  it('handles investor with no contributions or repayments', () => {
    const emptyInvestor: InvestorRecord = {
      id: 'inv-new',
      name: 'New Investor',
      contact: 'new@example.com',
      status: 'ACTIVE',
    };
    const stmt = buildInvestorStatement(emptyInvestor, contributions, repayments);

    expect(stmt.totalContributed.toFixed(2)).toBe('0.00');
    expect(stmt.totalRepaid.toFixed(2)).toBe('0.00');
    expect(stmt.currentStanding.toFixed(2)).toBe('0.00');
    expect(stmt.cycles).toHaveLength(0);
  });

  it('collects unique cycle IDs from both contributions and repayments', () => {
    // Investor A has cycle-1 (contributions + repayments) and cycle-2 (contributions only)
    const stmt = buildInvestorStatement(investorA, contributions, repayments);
    const cycleIds = stmt.cycles.map((c) => c.cycleId);
    expect(cycleIds).toContain('cycle-1');
    expect(cycleIds).toContain('cycle-2');
  });

  it('sorts cycles by ID', () => {
    const stmt = buildInvestorStatement(investorA, contributions, repayments);
    const cycleIds = stmt.cycles.map((c) => c.cycleId);
    expect(cycleIds).toEqual([...cycleIds].sort());
  });
});
