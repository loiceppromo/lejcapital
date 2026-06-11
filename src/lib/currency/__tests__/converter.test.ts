import { describe, it, expect } from 'vitest';
import { Decimal } from '@/lib/finance';
import {
  CURRENCIES,
  convertAmount,
  formatCurrency,
  formatDualCurrency,
  getExchangeRates,
  getRate,
} from '../converter';

describe('CURRENCIES', () => {
  it('has GHS and USD entries', () => {
    expect(CURRENCIES.GHS.code).toBe('GHS');
    expect(CURRENCIES.GHS.symbol).toBe('GH₵');
    expect(CURRENCIES.USD.code).toBe('USD');
    expect(CURRENCIES.USD.symbol).toBe('$');
  });
});

describe('getExchangeRates', () => {
  it('returns both GHS→USD and USD→GHS rates', () => {
    const rates = getExchangeRates();
    expect(rates.length).toBe(2);
    expect(rates.find((r) => r.from === 'GHS' && r.to === 'USD')).toBeTruthy();
    expect(rates.find((r) => r.from === 'USD' && r.to === 'GHS')).toBeTruthy();
  });

  it('rates are reasonable', () => {
    const rates = getExchangeRates();
    const ghsToUsd = rates.find((r) => r.from === 'GHS')!;
    const usdToGhs = rates.find((r) => r.from === 'USD')!;
    expect(ghsToUsd.rate).toBeGreaterThan(0.01);
    expect(ghsToUsd.rate).toBeLessThan(1);
    expect(usdToGhs.rate).toBeGreaterThan(1);
    expect(usdToGhs.rate).toBeLessThan(100);
  });
});

describe('getRate', () => {
  it('returns 1 for same currency', () => {
    expect(getRate('GHS', 'GHS')).toBe(1);
    expect(getRate('USD', 'USD')).toBe(1);
  });

  it('returns correct rate for GHS to USD', () => {
    const rate = getRate('GHS', 'USD');
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(1);
  });
});

describe('convertAmount', () => {
  it('returns null for null input', () => {
    expect(convertAmount(null, 'GHS', 'USD')).toBeNull();
  });

  it('returns same value for same currency', () => {
    const result = convertAmount(new Decimal(100), 'GHS', 'GHS');
    expect(result?.toNumber()).toBe(100);
  });

  it('converts GHS to USD', () => {
    const result = convertAmount(new Decimal(1000), 'GHS', 'USD');
    expect(result).not.toBeNull();
    expect(result!.toNumber()).toBeGreaterThan(50);
    expect(result!.toNumber()).toBeLessThan(100);
  });

  it('converts USD to GHS', () => {
    const result = convertAmount(new Decimal(100), 'USD', 'GHS');
    expect(result).not.toBeNull();
    expect(result!.toNumber()).toBeGreaterThan(1000);
    expect(result!.toNumber()).toBeLessThan(2000);
  });

  it('accepts plain numbers', () => {
    const result = convertAmount(1000, 'GHS', 'USD');
    expect(result).not.toBeNull();
    expect(result!.toNumber()).toBeGreaterThan(0);
  });
});

describe('formatCurrency', () => {
  it('formats GHS amounts', () => {
    const formatted = formatCurrency(new Decimal(1234.56), 'GHS');
    expect(formatted).toContain('GHS');
    expect(formatted).toContain('1,234.56');
  });

  it('formats USD amounts', () => {
    const formatted = formatCurrency(new Decimal(79.10), 'USD');
    expect(formatted).toContain('USD');
    expect(formatted).toContain('79.10');
  });

  it('returns TBC for null', () => {
    expect(formatCurrency(null, 'GHS')).toBe('TBC');
    expect(formatCurrency(null, 'USD')).toBe('TBC');
  });

  it('accepts plain numbers', () => {
    const formatted = formatCurrency(500, 'GHS');
    expect(formatted).toContain('GHS');
  });
});

describe('formatDualCurrency', () => {
  it('shows both currencies', () => {
    const result = formatDualCurrency(new Decimal(1000), 'GHS');
    expect(result).toContain('GHS');
    expect(result).toContain('USD');
  });

  it('returns TBC for null', () => {
    expect(formatDualCurrency(null)).toBe('TBC');
  });
});
