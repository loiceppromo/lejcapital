export const SLEEVE_COLORS: Record<string, string> = {
  PROTECTION: '#6ba3d2',
  RESERVE: '#2fa777',
  OPERATING_ALPHA: '#8aa0b8',
  MARKET_ALPHA: '#3f7db4',
  LOAN_BOOK: '#d19a3a',
};

export function sleeveColor(type: string): string {
  return SLEEVE_COLORS[type] ?? '#697587';
}
