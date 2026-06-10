import { describe, it, expect } from 'vitest';
import { canAccess, canAccessRoute, getNavItemsForRole } from '../role-defs';

describe('canAccess', () => {
  it('FUND_MANAGER can do everything', () => {
    expect(canAccess('FUND_MANAGER', 'CREATE_CYCLE')).toBe(true);
    expect(canAccess('FUND_MANAGER', 'ADD_INVESTOR')).toBe(true);
    expect(canAccess('FUND_MANAGER', 'MANAGE_SETTINGS')).toBe(true);
    expect(canAccess('FUND_MANAGER', 'ADD_LEDGER_ENTRY')).toBe(true);
  });

  it('OPERATOR can record repayments and update engines but not create cycles', () => {
    expect(canAccess('OPERATOR', 'UPDATE_ENGINE')).toBe(true);
    expect(canAccess('OPERATOR', 'RECORD_LOAN_REPAYMENT')).toBe(true);
    expect(canAccess('OPERATOR', 'ADD_LEDGER_ENTRY')).toBe(true);
    expect(canAccess('OPERATOR', 'CREATE_CYCLE')).toBe(false);
    expect(canAccess('OPERATOR', 'SIZE_SLEEVES')).toBe(false);
    expect(canAccess('OPERATOR', 'ADD_INVESTOR')).toBe(false);
    expect(canAccess('OPERATOR', 'MANAGE_SETTINGS')).toBe(false);
  });

  it('INVESTOR can only view dashboard, portal, and reports', () => {
    expect(canAccess('INVESTOR', 'VIEW_DASHBOARD')).toBe(true);
    expect(canAccess('INVESTOR', 'VIEW_PORTAL')).toBe(true);
    expect(canAccess('INVESTOR', 'VIEW_REPORTS')).toBe(true);
    expect(canAccess('INVESTOR', 'VIEW_CYCLES')).toBe(false);
    expect(canAccess('INVESTOR', 'ADD_HOLDING')).toBe(false);
    expect(canAccess('INVESTOR', 'CREATE_CYCLE')).toBe(false);
  });
});

describe('canAccessRoute', () => {
  it('FUND_MANAGER can access all routes', () => {
    expect(canAccessRoute('FUND_MANAGER', '/dashboard')).toBe(true);
    expect(canAccessRoute('FUND_MANAGER', '/settings')).toBe(true);
    expect(canAccessRoute('FUND_MANAGER', '/cycles')).toBe(true);
    expect(canAccessRoute('FUND_MANAGER', '/portal')).toBe(true);
  });

  it('OPERATOR can access most routes but not settings', () => {
    expect(canAccessRoute('OPERATOR', '/dashboard')).toBe(true);
    expect(canAccessRoute('OPERATOR', '/loans')).toBe(true);
    expect(canAccessRoute('OPERATOR', '/audit')).toBe(true);
    expect(canAccessRoute('OPERATOR', '/settings')).toBe(false);
  });

  it('INVESTOR can only access dashboard, portal, reports, and limited exports', () => {
    expect(canAccessRoute('INVESTOR', '/dashboard')).toBe(true);
    expect(canAccessRoute('INVESTOR', '/portal')).toBe(true);
    expect(canAccessRoute('INVESTOR', '/reports')).toBe(true);
    expect(canAccessRoute('INVESTOR', '/cycles')).toBe(false);
    expect(canAccessRoute('INVESTOR', '/loans')).toBe(false);
    expect(canAccessRoute('INVESTOR', '/settings')).toBe(false);
    expect(canAccessRoute('INVESTOR', '/api/export/contributions')).toBe(true);
    expect(canAccessRoute('INVESTOR', '/api/export/loans')).toBe(false);
  });
});

describe('getNavItemsForRole', () => {
  it('FUND_MANAGER sees all 12 nav items', () => {
    const items = getNavItemsForRole('FUND_MANAGER');
    expect(items.length).toBe(12);
    expect(items.map((i) => i.label)).toContain('Settings');
    expect(items.map((i) => i.label)).toContain('Portal');
  });

  it('OPERATOR sees 11 items (no Settings)', () => {
    const items = getNavItemsForRole('OPERATOR');
    expect(items.map((i) => i.label)).not.toContain('Settings');
    expect(items.map((i) => i.label)).toContain('Dashboard');
    expect(items.map((i) => i.label)).toContain('Audit');
  });

  it('INVESTOR sees only 3 items', () => {
    const items = getNavItemsForRole('INVESTOR');
    expect(items.length).toBe(3);
    expect(items.map((i) => i.label)).toEqual(['Dashboard', 'Reports', 'Portal']);
  });
});
