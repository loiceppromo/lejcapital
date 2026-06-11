import { describe, expect, it } from 'vitest';
import { Decimal, computeRecommendedRate } from '../index';

describe('computeRecommendedRate', () => {
  it('prices above the T-Bill floor and explains the drivers', () => {
    const result = computeRecommendedRate({
      principal: new Decimal(20000),
      termMonths: 6,
      riskGrade: 'B',
      tbill91Rate: new Decimal('0.109'),
      pcr: new Decimal('1.18'),
      pcrStatus: 'GREEN',
      investorPrincipalDue: new Decimal(100000),
      currentNAV: new Decimal(120000),
      par30: new Decimal('0.02'),
      par90: new Decimal('0.00'),
      defaultRate: new Decimal('0.00'),
      loanBookOutstanding: new Decimal(30000),
      totalProvisions: new Decimal(300),
      activeLoanCount: 3,
    });

    expect(result.floor.toFixed(2)).toBe('12.40');
    expect(result.recommended.gte(result.floor)).toBe(true);
    expect(result.components.some((component) => component.label === 'T-Bill benchmark')).toBe(true);
    expect(result.opportunityCost.recommendedGrossInterest.gt(0)).toBe(true);
  });

  it('raises red-team findings for weak liquidity and risky borrowers', () => {
    const result = computeRecommendedRate({
      principal: new Decimal(25000),
      termMonths: 18,
      riskGrade: 'E',
      tbill91Rate: new Decimal('0.109'),
      pcr: new Decimal('0.98'),
      pcrStatus: 'PROTECTION_MODE',
      investorPrincipalDue: new Decimal(100000),
      currentNAV: new Decimal(110000),
      par30: new Decimal('0.20'),
      par90: new Decimal('0.10'),
      defaultRate: new Decimal('0.08'),
      loanBookOutstanding: new Decimal(15000),
      totalProvisions: new Decimal(3000),
      activeLoanCount: 1,
    });

    expect(result.riskLevel).toBe('VERY_HIGH');
    expect(result.redTeamFindings.some((finding) => finding.severity === 'BREACH')).toBe(true);
    expect(result.redTeamFindings.map((finding) => finding.finding).join(' ')).toContain('PCR');
  });
});
