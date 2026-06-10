export const SLEEVE_COLORS: Record<string, string> = {
  PROTECTION: '#052b57',
  RESERVE: '#1e6f5c',
  OPERATING_ALPHA: '#e67e22',
  MARKET_ALPHA: '#3b82f6',
  LOAN_BOOK: '#8b5cf6',
};

export function sleeveColor(type: string): string {
  return SLEEVE_COLORS[type] ?? '#94a3b8';
}
