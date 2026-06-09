import { describe, expect, it } from 'vitest';
import { Decimal } from '@/lib/finance';
import {
  buildInvestorStatement,
  investorPrincipalDueForCycle,
  totalInvestorPrincipalDue,
  type InvestorContributionRecord,
  type InvestorRepaymentRecord,
} from '../investors';

const contributions: InvestorContributionRecord[] = [
  {
    id: 'contribution-1',
    investorId: 'investor-1',
    cycleId: 'cycle-1',
    amount: new Decimal(30000),
    dateReceived: '2026-07-01',
  },
  {
    id: 'contribution-2',
    investorId: 'investor-2',
    cycleId: 'cycle-1',
    amount: new Decimal(70000),
    dateReceived: '2026-07-01',
  },
  {
    id: 'contribution-3',
    investorId: 'investor-1',
    cycleId: 'cycle-2',
    amount: new Decimal(15000),
    dateReceived: '2026-10-01',
  },
];

const repayments: InvestorRepaymentRecord[] = [
  {
    id: 'repayment-1',
    investorId: 'investor-1',
    cycleId: 'cycle-1',
    principalDue: new Decimal(30000),
    amountRepaid: new Decimal(30000),
    repaymentDate: '2026-09-30',
    pcrAtRepayment: new Decimal(1.18),
  },
];

describe('investor records', () => {
  it('computes principal due for a single investor and whole cycle', () => {
    expect(investorPrincipalDueForCycle('investor-1', 'cycle-1', contributions).toFixed(2)).toBe(
      '30000.00',
    );
    expect(totalInvestorPrincipalDue('cycle-1', contributions).toFixed(2)).toBe('100000.00');
  });

  it('builds a per-investor statement with current standing', () => {
    const statement = buildInvestorStatement(
      {
        id: 'investor-1',
        name: 'Akosua Mensah',
        contact: 'akosua@example.com',
        status: 'ACTIVE',
      },
      contributions,
      repayments,
    );

    expect(statement.totalContributed.toFixed(2)).toBe('45000.00');
    expect(statement.totalRepaid.toFixed(2)).toBe('30000.00');
    expect(statement.currentStanding.toFixed(2)).toBe('15000.00');
    expect(statement.cycles[0].pcrAtRepayment?.toFixed(2)).toBe('1.18');
  });
});
