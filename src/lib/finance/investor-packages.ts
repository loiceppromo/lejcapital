import { Decimal } from './types';
import type { PackageTier, GiftTier, PayoutPreference } from '@/generated/prisma/client';

export interface PackageCalculation {
  tier: PackageTier;
  investmentAmount: Decimal;
  cycleReturnRate: Decimal;
  cycleReturnAmount: Decimal;
  giftTier: GiftTier;
  giftEligible: boolean;
}

interface TierDef {
  tier: PackageTier;
  min: number;
  max: number | null;
  cycleRate: number;
  giftTier: GiftTier;
}

const TIERS: TierDef[] = [
  { tier: 'STARTER',   min: 3500,  max: 5999,  cycleRate: 0.06,  giftTier: 'NOT_ELIGIBLE' },
  { tier: 'GROWTH',    min: 6000,  max: 9999,  cycleRate: 0.07,  giftTier: 'NOT_ELIGIBLE' },
  { tier: 'PREMIUM',   min: 10000, max: 14999, cycleRate: 0.08,  giftTier: 'STANDARD' },
  { tier: 'EXECUTIVE', min: 15000, max: 22499, cycleRate: 0.09,  giftTier: 'PREMIUM' },
  { tier: 'ELITE',     min: 22500, max: null,  cycleRate: 0.095, giftTier: 'EXECUTIVE' },
];

export const MIN_INVESTMENT = 3500;

export function getTierForAmount(amount: Decimal): TierDef {
  const n = Number(amount);
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (n >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

export function calculatePackage(investmentAmount: Decimal): PackageCalculation {
  const tierDef = getTierForAmount(investmentAmount);
  const amt = new Decimal(investmentAmount);
  const rate = new Decimal(tierDef.cycleRate);
  const returnAmt = amt.mul(rate);

  return {
    tier: tierDef.tier,
    investmentAmount: amt,
    cycleReturnRate: rate,
    cycleReturnAmount: returnAmt,
    giftTier: tierDef.giftTier,
    giftEligible: tierDef.giftTier !== 'NOT_ELIGIBLE',
  };
}

export interface ReinvestmentCalculation {
  preference: PayoutPreference;
  originalInvestment: Decimal;
  cycleReturn: Decimal;
  payoutAmount: Decimal;
  reinvestmentAmount: Decimal;
  newTier: PackageTier;
  newCycleRate: Decimal;
  customSplitPercent?: number;
}

export function calculateReinvestment(
  originalInvestment: Decimal,
  cycleReturn: Decimal,
  preference: PayoutPreference,
  customReinvestPercent?: number,
): ReinvestmentCalculation {
  const principal = new Decimal(originalInvestment);
  const returns = new Decimal(cycleReturn);
  const total = principal.add(returns);

  let payoutAmount: Decimal = new Decimal(0);
  let reinvestmentAmount: Decimal = new Decimal(0);

  switch (preference) {
    case 'FULL_PAYOUT':
      payoutAmount = total;
      reinvestmentAmount = new Decimal(0);
      break;
    case 'FULL_REINVESTMENT':
      payoutAmount = new Decimal(0);
      reinvestmentAmount = total;
      break;
    case 'PRINCIPAL_REINVESTMENT':
      payoutAmount = returns;
      reinvestmentAmount = principal;
      break;
    case 'CUSTOM': {
      const pct = (customReinvestPercent ?? 50) / 100;
      reinvestmentAmount = total.mul(new Decimal(pct));
      payoutAmount = total.sub(reinvestmentAmount);
      break;
    }
  }

  const newPackage = calculatePackage(reinvestmentAmount);

  return {
    preference,
    originalInvestment: principal,
    cycleReturn: returns,
    payoutAmount,
    reinvestmentAmount,
    newTier: newPackage.tier,
    newCycleRate: newPackage.cycleReturnRate,
    customSplitPercent: preference === 'CUSTOM' ? customReinvestPercent : undefined,
  };
}

export function getAllTiers() {
  return TIERS.map((t) => ({
    tier: t.tier,
    minInvestment: t.min,
    maxInvestment: t.max,
    cycleReturnRate: t.cycleRate,
    giftTier: t.giftTier,
  }));
}

export function formatTierName(tier: PackageTier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export function formatPayoutPreference(pref: PayoutPreference): string {
  switch (pref) {
    case 'FULL_PAYOUT': return 'Full Payout';
    case 'FULL_REINVESTMENT': return 'Full Reinvestment';
    case 'PRINCIPAL_REINVESTMENT': return 'Principal Reinvestment';
    case 'CUSTOM': return 'Custom Split';
    default: return pref;
  }
}
