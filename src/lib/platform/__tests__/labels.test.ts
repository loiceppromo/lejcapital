import { describe, it, expect } from 'vitest';
import {
  pcrStatusLabel,
  cycleStatusLabel,
  capitalCycleStatusLabel,
  sleeveTypeLabel,
  humanizeEnum,
} from '../labels';

describe('labels', () => {
  it('never surfaces raw PROTECTION_MODE to users', () => {
    expect(pcrStatusLabel('PROTECTION_MODE')).toBe('Principal Protection Active');
    expect(pcrStatusLabel('GREEN')).toBe('Healthy');
    expect(pcrStatusLabel('WATCH')).toBe('Monitoring');
    expect(pcrStatusLabel('CAUTION')).toBe('Caution');
  });

  it('humanizes cycle and capital statuses', () => {
    expect(cycleStatusLabel('PLANNING')).toBe('Planning');
    expect(cycleStatusLabel('CLOSED')).toBe('Closed');
    expect(capitalCycleStatusLabel('PAID_OUT')).toBe('Paid out');
    expect(capitalCycleStatusLabel('REINVESTED')).toBe('Reinvested');
  });

  it('humanizes sleeve types', () => {
    expect(sleeveTypeLabel('OPERATING_ALPHA')).toBe('Operating Alpha');
    expect(sleeveTypeLabel('LOAN_BOOK')).toBe('Loan Book');
  });

  it('falls back to Title Case for unknown codes', () => {
    expect(humanizeEnum('SOME_NEW_CODE')).toBe('Some New Code');
    expect(humanizeEnum('')).toBe('');
  });
});
