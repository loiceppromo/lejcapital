/**
 * Client-safe role definitions for LEJ Capital.
 *
 * This module contains ONLY pure functions with no server-side imports.
 * Safe to use in 'use client' components.
 *
 * Three tiers:
 *   FUND_MANAGER — full access to all pages and actions
 *   OPERATOR     — can view all pages, record repayments, update engines, add ledger entries
 *   INVESTOR     — read-only portal showing own statements, contributions, and cycle status (labelled "Partner" in UI)
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
  | 'gear'
  | 'file-text'
  | 'sparkles';

/** Actions that each role can perform */
const ROLE_ACTIONS: Record<Role, Set<string>> = {
  FUND_MANAGER: new Set([
    'VIEW_DASHBOARD', 'VIEW_CYCLES', 'VIEW_LEDGER', 'VIEW_MARKET', 'VIEW_LOANS',
    'VIEW_ENGINES', 'VIEW_INVESTORS', 'VIEW_RISK', 'VIEW_REPORTS', 'VIEW_AUDIT',
    'VIEW_SETTINGS', 'VIEW_PORTAL', 'VIEW_GUIDE',
    'CREATE_CYCLE', 'TRANSITION_CYCLE', 'SIZE_SLEEVES',
    'ADD_ENGINE', 'UPDATE_ENGINE',
    'ADD_HOLDING', 'RECORD_MARKET_TRADE', 'UPDATE_REGIME',
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
    'VIEW_PORTAL', 'VIEW_GUIDE',
    'UPDATE_ENGINE',
    'RECORD_LOAN_REPAYMENT',
    'ADD_LEDGER_ENTRY',
    'RESOLVE_MISSING_DATA',
  ]),
  INVESTOR: new Set([
    'VIEW_DASHBOARD', 'VIEW_PORTAL', 'VIEW_REPORTS', 'VIEW_GUIDE',
  ]),
};

/** Which routes each role can access (path prefix matching) */
const ROUTE_ACCESS: Record<Role, string[]> = {
  FUND_MANAGER: [
    '/dashboard', '/cycles', '/ledger', '/market', '/loans', '/calculator', '/engines',
    '/investors', '/risk', '/reports', '/audit', '/settings', '/portal', '/guide', '/ai-advisor',
    '/api/export',
  ],
  OPERATOR: [
    '/dashboard', '/cycles', '/ledger', '/market', '/loans', '/calculator', '/engines',
    '/investors', '/risk', '/reports', '/audit', '/portal', '/guide', '/ai-advisor',
    '/api/export',
  ],
  INVESTOR: [
    '/dashboard', '/portal', '/reports', '/guide',
    '/api/export/dashboard-snapshot',
    '/api/export/contributions',
    '/api/export/investor-statement-pdf',
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

/** Logical sidebar groups, in display order. */
export type NavGroup = 'Overview' | 'Capital Operations' | 'Portfolio' | 'Control' | 'Access';
export const NAV_GROUP_ORDER: NavGroup[] = ['Overview', 'Capital Operations', 'Portfolio', 'Control', 'Access'];

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  minRole: Role;
  group: NavGroup;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'chart-bar', minRole: 'INVESTOR', group: 'Overview' },
  { label: 'Advisor', href: '/ai-advisor', icon: 'sparkles', minRole: 'OPERATOR', group: 'Overview' },
  { label: 'Cycles', href: '/cycles', icon: 'arrows-repeat', minRole: 'OPERATOR', group: 'Capital Operations' },
  { label: 'Ledger', href: '/ledger', icon: 'book-open', minRole: 'OPERATOR', group: 'Capital Operations' },
  { label: 'Loans', href: '/loans', icon: 'banknotes', minRole: 'OPERATOR', group: 'Capital Operations' },
  { label: 'Rate Calc', href: '/calculator', icon: 'trending-up', minRole: 'OPERATOR', group: 'Capital Operations' },
  { label: 'Investors', href: '/investors', icon: 'users', minRole: 'OPERATOR', group: 'Capital Operations' },
  { label: 'Market', href: '/market', icon: 'trending-up', minRole: 'OPERATOR', group: 'Portfolio' },
  { label: 'Businesses', href: '/engines', icon: 'cog', minRole: 'OPERATOR', group: 'Portfolio' },
  { label: 'Risk', href: '/risk', icon: 'shield', minRole: 'OPERATOR', group: 'Control' },
  { label: 'Reports', href: '/reports', icon: 'clipboard', minRole: 'INVESTOR', group: 'Control' },
  { label: 'Audit', href: '/audit', icon: 'archive-box', minRole: 'OPERATOR', group: 'Control' },
  { label: 'Portal', href: '/portal', icon: 'users', minRole: 'INVESTOR', group: 'Access' },
  { label: 'Guide', href: '/guide', icon: 'file-text', minRole: 'INVESTOR', group: 'Access' },
  { label: 'Settings', href: '/settings', icon: 'gear', minRole: 'FUND_MANAGER', group: 'Access' },
];

const ROLE_HIERARCHY: Role[] = ['INVESTOR', 'OPERATOR', 'FUND_MANAGER'];

/** Flat nav items filtered by role (display order). */
export function getNavItemsForRole(role: Role): NavItem[] {
  const roleLevel = ROLE_HIERARCHY.indexOf(role);
  return NAV_ITEMS.filter((item) => roleLevel >= ROLE_HIERARCHY.indexOf(item.minRole));
}

/**
 * Nav items grouped into labelled sections, in display order. Groups with no
 * accessible items for the role are omitted.
 */
export function getNavGroupsForRole(role: Role): { group: NavGroup; items: NavItem[] }[] {
  const items = getNavItemsForRole(role);
  return NAV_GROUP_ORDER
    .map((group) => ({ group, items: items.filter((i) => i.group === group) }))
    .filter((section) => section.items.length > 0);
}
