/**
 * Look up an investor record by email address.
 *
 * In seed mode, matches against InvestorRecord.contact.
 * In DB mode, matches against Investor.email (set during mapping in queries.ts).
 *
 * Returns the matching investor or null if not found.
 */
import type { InvestorRecord } from './investors';

/**
 * Find the investor record matching a given email.
 * Case-insensitive comparison on the contact/email field.
 */
export function findInvestorByEmail(
  investors: InvestorRecord[],
  email: string | null | undefined,
): InvestorRecord | null {
  if (!email) return null;
  const normalised = email.toLowerCase().trim();
  return investors.find((inv) => inv.contact.toLowerCase().trim() === normalised) ?? null;
}

/**
 * Filter investor-scoped data: returns only the given investor's records,
 * or all records if investorId is null (admin/operator view).
 */
export function scopeToInvestor<T extends { investorId: string }>(
  records: T[],
  investorId: string | null,
): T[] {
  if (!investorId) return records;
  return records.filter((r) => r.investorId === investorId);
}
