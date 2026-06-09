import { Decimal } from '@/lib/finance';

export type InvestorStatus = 'ACTIVE' | 'INACTIVE';

export interface InvestorRecord {
  id: string;
  name: string;
  contact: string;
  status: InvestorStatus;
}

export interface InvestorContributionRecord {
  id: string;
  investorId: string;
  cycleId: string;
  amount: Decimal;
  dateReceived: string;
}

export interface InvestorRepaymentRecord {
  id: string;
  investorId: string;
  cycleId: string;
  principalDue: Decimal;
  amountRepaid: Decimal;
  repaymentDate: string;
  pcrAtRepayment: Decimal | null;
}

export interface InvestorStatement {
  investor: InvestorRecord;
  totalContributed: Decimal;
  totalRepaid: Decimal;
  currentStanding: Decimal;
  cycles: Array<{
    cycleId: string;
    contributed: Decimal;
    repaid: Decimal;
    pcrAtRepayment: Decimal | null;
  }>;
}

export function investorPrincipalDueForCycle(
  investorId: string,
  cycleId: string,
  contributions: InvestorContributionRecord[],
): Decimal {
  return contributions
    .filter((contribution) => contribution.investorId === investorId && contribution.cycleId === cycleId)
    .reduce((sum, contribution) => sum.plus(contribution.amount), new Decimal(0));
}

export function totalInvestorPrincipalDue(
  cycleId: string,
  contributions: InvestorContributionRecord[],
): Decimal {
  return contributions
    .filter((contribution) => contribution.cycleId === cycleId)
    .reduce((sum, contribution) => sum.plus(contribution.amount), new Decimal(0));
}

export function buildInvestorStatement(
  investor: InvestorRecord,
  contributions: InvestorContributionRecord[],
  repayments: InvestorRepaymentRecord[],
): InvestorStatement {
  const investorContributions = contributions.filter((entry) => entry.investorId === investor.id);
  const investorRepayments = repayments.filter((entry) => entry.investorId === investor.id);
  const cycleIds = Array.from(
    new Set([
      ...investorContributions.map((entry) => entry.cycleId),
      ...investorRepayments.map((entry) => entry.cycleId),
    ]),
  ).sort();

  const totalContributed = investorContributions.reduce(
    (sum, contribution) => sum.plus(contribution.amount),
    new Decimal(0),
  );
  const totalRepaid = investorRepayments.reduce(
    (sum, repayment) => sum.plus(repayment.amountRepaid),
    new Decimal(0),
  );

  return {
    investor,
    totalContributed,
    totalRepaid,
    currentStanding: totalContributed.minus(totalRepaid),
    cycles: cycleIds.map((cycleId) => {
      const contributed = investorContributions
        .filter((entry) => entry.cycleId === cycleId)
        .reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0));
      const cycleRepayments = investorRepayments.filter((entry) => entry.cycleId === cycleId);
      const repaid = cycleRepayments.reduce((sum, entry) => sum.plus(entry.amountRepaid), new Decimal(0));
      const latestRepayment = cycleRepayments.at(-1);

      return {
        cycleId,
        contributed,
        repaid,
        pcrAtRepayment: latestRepayment?.pcrAtRepayment ?? null,
      };
    }),
  };
}
