/**
 * Client-safe role definitions for LEJ Capital.
 *
 * This module contains ONLY pure functions with no server-side imports.
 * Safe to use in 'use client' components.
 *
 * Three tiers:
 *   FUND_MANAGER — full access to all pages and actions
 *   OPERATOR     — can view all pages, record repayments, update engines, add ledger entries
 *   INVESTOR     — read-only portal showing own statements, contributions, and cycle status
 */

export type Role = 'FUND_MANAGER' | 'OPERATOR' | 'INVESTOR';
export type NavIcon =
  | 'chart-bar'
  | 'arrows-repeat'
  | 'book-open'
  | 'trending-up'
  | 'banknotes'
  | 'cog'
  | 'users'
  | 'shield'
  | 'clipboard'
  | 'archive-box'
  | 'gear';

/** Actions that each role can perform */
const ROLE_ACTIONS: Record<Role, Set<string>> = {
  FUND_MANAGER: new Set([
    'VIEW_DASHBOARD', 'VIEW_CYCLES', 'VIEW_LEDGER', 'VIEW_MARKET', 'VIEW_LOANS',
    'VIEW_ENGINES', 'VIEW_INVESTORS', 'VIEW_RISK', 'VIEW_REPORTS', 'VIEW_AUDIT',
    'VIEW_SETTINGS', 'VIEW_PORTAL',
    'CREATE_CYCLE', 'TRANSITION_CYCLE', 'SIZE_SLEEVES',
    'ADD_ENGINE', 'UPDATE_ENGINE',
    'ADD_HOLDING', 'UPDATE_REGIME',
    'ADD_BORROWER', 'ORIGINATE_LOAN', 'RECORD_LOAN_REPAYMENT',
    'ADD_INVESTOR', 'RECORD_CONTRIBUTION', 'RECORD_INVESTOR_REPAYMENT',
    'ADD_LEDGER_ENTRY',
    'RECORD_IC_DECISION', 'CAPTURE_SNAPSHOT', 'RESOLVE_MISSING_DATA',
    'RUN_WATERFALL',
    'MANAGE_SETTINGS',
  ]),
  OPERATOR: new Set([
    'VIEW_DASHBOARD', 'VIEW_CYCLES', 'VIEW_LEDGER', 'VIEW_MARKET', 'VIEW_LOANS',
    'VIEW_ENGINES', 'VIEW_INVESTORS', 'VIEW_RISK', 'VIEW_REPORTS', 'VIEW_AUDIT',
    'VIEW_PORTAL',
    'UPDATE_ENGINE',
    'RECORD_LOAN_REPAYMENT',
    'ADD_LEDGER_ENTRY',
    'RESOLVE_MISSING_DATA',
  ]),
  INVESTOR: new Set([
    'VIEW_DASHBOARD', 'VIEW_PORTAL', 'VIEW_REPORTS',
  ]),
};

/** Which routes each role can access (path prefix matching) */
const ROUTE_ACCESS: Record<Role, string[]> = {
  FUND_MANAGER: [
    '/dashboard', '/cycles', '/ledger', '/market', '/loans', '/engines',
    '/investors', '/risk', '/reports', '/audit', '/settings', '/portal',
    '/api/export',
  ],
  OPERATOR: [
    '/dashboard', '/cycles', '/ledger', '/market', '/loans', '/engines',
    '/investors', '/risk', '/reports', '/audit', '/portal',
    '/api/export',
  ],
  INVESTOR: [
    '/dashboard', '/portal', '/reports',
    '/api/export/dashboard-snapshot', '/api/export/contributions',
  ],
};

export function canAccess(role: Role, action: string): boolean {
  return ROLE_ACTIONS[role]?.has(action) ?? false;
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  const routes = ROUTE_ACCESS[role];
  if (!routes) return false;
  return routes.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

/** Nav items filtered by role */
export function getNavItemsForRole(role: Role) {
  const allItems = [
    { label: 'Dashboard', href: '/dashboard', icon: 'chart-bar' as NavIcon, minRole: 'INVESTOR' as Role },
    { label: 'Cycles', href: '/cycles', icon: 'arrows-repeat' as NavIcon, minRole: 'OPERATOR' as Role },
    { label: 'Ledger', href: '/ledger', icon: 'book-open' as NavIcon, minRole: 'OPERATOR' as Role },
    { label: 'Market', href: '/market', icon: 'trending-up' as NavIcon, minRole: 'OPERATOR' as Role },
    { label: 'Loans', href: '/loans', icon: 'banknotes' as NavIcon, minRole: 'OPERATOR' as Role },
    { label: 'Engines', href: '/engines', icon: 'cog' as NavIcon, minRole: 'OPERATOR' as Role },
    { label: 'Investors', href: '/investors', icon: 'users' as NavIcon, minRole: 'OPERATOR' as Role },
    { label: 'Risk', href: '/risk', icon: 'shield' as NavIcon, minRole: 'OPERATOR' as Role },
    { label: 'Reports', href: '/reports', icon: 'clipboard' as NavIcon, minRole: 'INVESTOR' as Role },
    { label: 'Audit', href: '/audit', icon: 'archive-box' as NavIcon, minRole: 'OPERATOR' as Role },
    { label: 'Portal', href: '/portal', icon: 'users' as NavIcon, minRole: 'INVESTOR' as Role },
    { label: 'Settings', href: '/settings', icon: 'gear' as NavIcon, minRole: 'FUND_MANAGER' as Role },
  ];

  const hierarchy: Role[] = ['INVESTOR', 'OPERATOR', 'FUND_MANAGER'];
  const roleLevel = hierarchy.indexOf(role);

  return allItems.filter((item) => roleLevel >= hierarchy.indexOf(item.minRole));
}
