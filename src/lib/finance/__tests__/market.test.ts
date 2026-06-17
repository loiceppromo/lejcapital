import { describe, it, expect } from 'vitest';
import {
  blendedMarketReturn,
  canUseOpportunistic,
  resolveRegime,
  checkDrawdown,
  singleNameLimit,
  checkGSEExposure,
  evaluateMarketTradePrecheck,
  evaluateMarketPolicy,
  REGIME_SPLITS,
} from '../market';
import { Decimal } from '../types';

function d(v: string | number) {
  return new Decimal(v);
}

describe('regime splits', () => {
  it('Defensive: 35/55/10', () => {
    const s = REGIME_SPLITS.DEFENSIVE;
    expect(s.gsePct.toFixed(2)).toBe('0.35');
    expect(s.tbillPct.toFixed(2)).toBe('0.55');
    expect(s.cashPct.toFixed(2)).toBe('0.10');
  });

  it('Normal: 55/35/10', () => {
    const s = REGIME_SPLITS.NORMAL;
    expect(s.gsePct.toFixed(2)).toBe('0.55');
    expect(s.tbillPct.toFixed(2)).toBe('0.35');
    expect(s.cashPct.toFixed(2)).toBe('0.10');
  });

  it('Opportunistic: 70/25/5', () => {
    const s = REGIME_SPLITS.OPPORTUNISTIC;
    expect(s.gsePct.toFixed(2)).toBe('0.70');
    expect(s.tbillPct.toFixed(2)).toBe('0.25');
    expect(s.cashPct.toFixed(2)).toBe('0.05');
  });

  it('all regimes sum to 100%', () => {
    for (const regime of Object.values(REGIME_SPLITS)) {
      const total = regime.gsePct.plus(regime.tbillPct).plus(regime.cashPct);
      expect(total.toFixed(2)).toBe('1.00');
    }
  });
});

describe('evaluateMarketTradePrecheck', () => {
  const basePolicy = evaluateMarketPolicy({
    requestedRegime: 'NORMAL',
    triggers: {
      pcrAbove125: true,
      undcDemandValidated: true,
      marketCatalystDocumented: true,
      noOpenOperationalIssues: true,
    },
    marketAlphaStartValue: d(100000),
    marketAlphaCurrentValue: d(100000),
    nav: d(150000),
    holdings: [
      { instrumentType: 'GSE_EQUITY', name: 'MTNGH', amountInvested: d(20000), currentValue: d(20000) },
      { instrumentType: 'GSE_EQUITY', name: 'GCB', amountInvested: d(15000), currentValue: d(15000) },
      { instrumentType: 'TBILL', name: '91D T-Bill', amountInvested: d(50000), currentValue: d(50000) },
      { instrumentType: 'CASH', name: 'Broker cash', amountInvested: d(15000), currentValue: d(15000) },
    ],
  });

  it('approves a compliant T-Bill buy', () => {
    const result = evaluateMarketTradePrecheck({
      side: 'BUY',
      instrumentType: 'TBILL',
      name: '182D T-Bill',
      grossAmount: d(10000),
      fees: d(0),
      holdings: [],
      policy: basePolicy,
      marketAlphaCurrentValue: d(100000),
      nav: d(150000),
    });

    expect(result.approved).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it('blocks a GSE buy above the hard ceiling', () => {
    const result = evaluateMarketTradePrecheck({
      side: 'BUY',
      instrumentType: 'GSE_EQUITY',
      name: 'MTNGH',
      grossAmount: d(40000),
      fees: d(0),
      holdings: [
        { instrumentType: 'GSE_EQUITY', name: 'MTNGH', amountInvested: d(20000), currentValue: d(20000) },
        { instrumentType: 'GSE_EQUITY', name: 'GCB', amountInvested: d(15000), currentValue: d(15000) },
      ],
      policy: basePolicy,
      marketAlphaCurrentValue: d(100000),
      nav: d(300000),
    });

    expect(result.approved).toBe(false);
    expect(result.blockers).toContain('Projected GSE exposure breaches the 70% hard ceiling.');
  });

  it('blocks GSE buys during drawdown controls', () => {
    const drawdownPolicy = evaluateMarketPolicy({
      requestedRegime: 'NORMAL',
      triggers: {
        pcrAbove125: true,
        undcDemandValidated: true,
        marketCatalystDocumented: true,
        noOpenOperationalIssues: true,
      },
      marketAlphaStartValue: d(100000),
      marketAlphaCurrentValue: d(85000),
      nav: d(150000),
      holdings: [
        { instrumentType: 'GSE_EQUITY', name: 'MTNGH', amountInvested: d(30000), currentValue: d(30000) },
        { instrumentType: 'TBILL', name: '91D T-Bill', amountInvested: d(55000), currentValue: d(55000) },
      ],
    });

    const result = evaluateMarketTradePrecheck({
      side: 'BUY',
      instrumentType: 'GSE_EQUITY',
      name: 'GCB',
      grossAmount: d(5000),
      fees: d(0),
      holdings: [],
      policy: drawdownPolicy,
      marketAlphaCurrentValue: d(85000),
      nav: d(150000),
    });

    expect(result.approved).toBe(false);
    expect(result.blockers).toContain('GSE buys are halted while market drawdown controls are active.');
  });
});

describe('blendedMarketReturn', () => {
  it('computes blended return for Normal/Base', () => {
    const result = blendedMarketReturn('NORMAL', 'BASE', {
      gseRate: d('0.06'),
      tbillRate: d('0.027'),
      cashRate: d('0'),
    });
    // 0.55*0.06 + 0.35*0.027 + 0.10*0 = 0.033 + 0.00945 = 0.04245
    expect(result.toFixed(5)).toBe('0.04245');
  });

  it('computes blended return for Defensive/Bear', () => {
    const result = blendedMarketReturn('DEFENSIVE', 'BEAR', {
      gseRate: d('-0.15'),
      tbillRate: d('0.027'),
      cashRate: d('0'),
    });
    // 0.35*(-0.15) + 0.55*0.027 + 0.10*0 = -0.0525 + 0.01485 = -0.03765
    expect(result.toFixed(5)).toBe('-0.03765');
  });
});

describe('canUseOpportunistic', () => {
  it('requires all four triggers', () => {
    expect(
      canUseOpportunistic({
        pcrAbove125: true,
        undcDemandValidated: true,
        marketCatalystDocumented: true,
        noOpenOperationalIssues: true,
      }),
    ).toBe(true);
  });

  it('fails if any trigger is false', () => {
    expect(
      canUseOpportunistic({
        pcrAbove125: true,
        undcDemandValidated: true,
        marketCatalystDocumented: false,
        noOpenOperationalIssues: true,
      }),
    ).toBe(false);
  });
});

describe('resolveRegime', () => {
  it('returns Opportunistic when all triggers pass', () => {
    const regime = resolveRegime('OPPORTUNISTIC', {
      pcrAbove125: true,
      undcDemandValidated: true,
      marketCatalystDocumented: true,
      noOpenOperationalIssues: true,
    });
    expect(regime).toBe('OPPORTUNISTIC');
  });

  it('downgrades to Normal when triggers fail', () => {
    const regime = resolveRegime('OPPORTUNISTIC', {
      pcrAbove125: true,
      undcDemandValidated: false,
      marketCatalystDocumented: true,
      noOpenOperationalIssues: true,
    });
    expect(regime).toBe('NORMAL');
  });

  it('passes through Defensive and Normal without trigger checks', () => {
    expect(
      resolveRegime('DEFENSIVE', {
        pcrAbove125: false,
        undcDemandValidated: false,
        marketCatalystDocumented: false,
        noOpenOperationalIssues: false,
      }),
    ).toBe('DEFENSIVE');
  });
});

describe('checkDrawdown', () => {
  it('flags at 12% drawdown', () => {
    const result = checkDrawdown({
      currentValue: d(88000),
      cycleStartValue: d(100000),
    });
    expect(result.status).toBe('FLAG');
    expect(result.drawdownPct.toFixed(2)).toBe('0.12');
  });

  it('triggers liquidation at 20% drawdown', () => {
    const result = checkDrawdown({
      currentValue: d(80000),
      cycleStartValue: d(100000),
    });
    expect(result.status).toBe('LIQUIDATE');
    expect(result.drawdownPct.toFixed(2)).toBe('0.20');
  });

  it('returns NORMAL for no drawdown', () => {
    const result = checkDrawdown({
      currentValue: d(105000),
      cycleStartValue: d(100000),
    });
    expect(result.status).toBe('NORMAL');
    expect(result.drawdownPct.toFixed(2)).toBe('0.00');
  });

  it('returns NORMAL for 11% drawdown (below threshold)', () => {
    const result = checkDrawdown({
      currentValue: d(89000),
      cycleStartValue: d(100000),
    });
    expect(result.status).toBe('NORMAL');
  });
});

describe('singleNameLimit', () => {
  it('returns lower of 25% MA or 15% NAV', () => {
    // 25% of 200000 = 50000; 15% of 500000 = 75000 → min = 50000
    expect(singleNameLimit(d(200000), d(500000)).toFixed(2)).toBe('50000.00');

    // 25% of 400000 = 100000; 15% of 500000 = 75000 → min = 75000
    expect(singleNameLimit(d(400000), d(500000)).toFixed(2)).toBe('75000.00');
  });
});

describe('checkGSEExposure', () => {
  it('detects within limit', () => {
    const result = checkGSEExposure(d(60000), d(100000));
    expect(result.withinLimit).toBe(true);
    expect(result.currentPct.toFixed(2)).toBe('0.60');
  });

  it('detects breach of 70% ceiling', () => {
    const result = checkGSEExposure(d(75000), d(100000));
    expect(result.withinLimit).toBe(false);
    expect(result.currentPct.toFixed(2)).toBe('0.75');
  });
});

describe('evaluateMarketPolicy', () => {
  it('downgrades opportunistic, evaluates targets, and emits required actions', () => {
    const result = evaluateMarketPolicy({
      requestedRegime: 'OPPORTUNISTIC',
      triggers: {
        pcrAbove125: true,
        undcDemandValidated: false,
        marketCatalystDocumented: true,
        noOpenOperationalIssues: true,
      },
      marketAlphaStartValue: d(100000),
      marketAlphaCurrentValue: d(82000),
      nav: d(150000),
      holdings: [
        {
          instrumentType: 'GSE_EQUITY',
          name: 'GLD',
          amountInvested: d(30000),
          currentValue: d(30000),
        },
        {
          instrumentType: 'GSE_EQUITY',
          name: 'MTNGH',
          amountInvested: d(29000),
          currentValue: d(29000),
        },
        {
          instrumentType: 'TBILL',
          name: '91D T-Bill',
          amountInvested: d(18000),
          currentValue: d(18000),
        },
        {
          instrumentType: 'CASH',
          name: 'Cash',
          amountInvested: d(5000),
          currentValue: d(5000),
        },
      ],
    });

    expect(result.effectiveRegime).toBe('NORMAL');
    expect(result.regimeWasDowngraded).toBe(true);
    expect(result.targetAmounts.gse.toFixed(2)).toBe('45100.00');
    expect(result.drawdown.status).toBe('FLAG');
    expect(result.gseExposure.withinLimit).toBe(false);
    expect(result.minNamesSatisfied).toBe(false);
    expect(result.singleNameChecks[0].withinLimit).toBe(false);
    expect(result.actions).toContain('Opportunistic gate failed; default to Normal regime.');
    expect(result.actions).toContain('Switch to Defensive regime');
  });
});
