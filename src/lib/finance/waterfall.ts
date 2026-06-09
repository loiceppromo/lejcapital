import { Decimal, ZERO, type WaterfallClaim, type WaterfallResult } from './types';

export const WATERFALL_PRIORITIES: { priority: number; claimType: string }[] = [
  { priority: 1, claimType: 'INVESTOR_PRINCIPAL' },
  { priority: 2, claimType: 'SUPPLIER_LIABILITIES' },
  { priority: 3, claimType: 'TAXES' },
  { priority: 4, claimType: 'CUSTOMER_REFUNDS' },
  { priority: 5, claimType: 'EMERGENCY_PRODUCTION' },
  { priority: 6, claimType: 'RESERVE_REBUILD' },
  { priority: 7, claimType: 'REINVESTMENT' },
  { priority: 8, claimType: 'EXPANSION' },
];

export function runWaterfall(
  totalCash: Decimal,
  claims: WaterfallClaim[],
): WaterfallResult[] {
  const sorted = [...claims].sort((a, b) => a.priority - b.priority);
  let remaining = totalCash;
  const results: WaterfallResult[] = [];

  for (const claim of sorted) {
    const amountPaid = Decimal.min(remaining, claim.amountClaimed);
    remaining = remaining.minus(amountPaid);
    const fullyPaid = amountPaid.gte(claim.amountClaimed);

    results.push({
      priority: claim.priority,
      claimType: claim.claimType,
      amountClaimed: claim.amountClaimed,
      amountPaid,
      fullyPaid,
      cashAfter: remaining,
    });

    if (remaining.isZero()) {
      for (const remainingClaim of sorted.slice(sorted.indexOf(claim) + 1)) {
        results.push({
          priority: remainingClaim.priority,
          claimType: remainingClaim.claimType,
          amountClaimed: remainingClaim.amountClaimed,
          amountPaid: ZERO,
          fullyPaid: false,
          cashAfter: ZERO,
        });
      }
      break;
    }
  }

  return results;
}
