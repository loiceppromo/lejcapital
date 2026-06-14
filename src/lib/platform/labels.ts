/**
 * User-facing labels for internal enum/status codes.
 *
 * Raw codes like `PROTECTION_MODE` or `OPERATING_ALPHA` must never reach the
 * UI — especially the partner-facing portal. Map them here so every surface
 * renders the same calm, professional wording.
 */

/** PCR health bands (from the finance engine: GREEN | WATCH | CAUTION | PROTECTION_MODE). */
export function pcrStatusLabel(status: string): string {
  switch (status) {
    case 'GREEN':
      return 'Healthy';
    case 'WATCH':
      return 'Monitoring';
    case 'CAUTION':
      return 'Caution';
    case 'PROTECTION_MODE':
      return 'Principal Protection Active';
    default:
      return humanizeEnum(status);
  }
}

/** Cycle lifecycle states. */
export function cycleStatusLabel(status: string): string {
  switch (status) {
    case 'PLANNING':
      return 'Planning';
    case 'ACTIVE':
      return 'Active';
    case 'CLOSING':
      return 'Closing';
    case 'CLOSED':
      return 'Closed';
    default:
      return humanizeEnum(status);
  }
}

/** Capital (investor) cycle states. */
export function capitalCycleStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'MATURED':
      return 'Matured';
    case 'PAID_OUT':
      return 'Paid out';
    case 'REINVESTED':
      return 'Reinvested';
    default:
      return humanizeEnum(status);
  }
}

/** Sleeve categories. */
export function sleeveTypeLabel(type: string): string {
  switch (type) {
    case 'PROTECTION':
      return 'Protection';
    case 'OPERATING_ALPHA':
      return 'Operating Alpha';
    case 'MARKET_ALPHA':
      return 'Market Alpha';
    case 'RESERVE':
      return 'Reserve';
    case 'LOAN_BOOK':
      return 'Loan Book';
    default:
      return humanizeEnum(type);
  }
}

/**
 * Generic fallback: turn an UPPER_SNAKE_CASE code into Title Case words.
 * e.g. "PROTECTION_MODE" → "Protection Mode".
 */
export function humanizeEnum(value: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
