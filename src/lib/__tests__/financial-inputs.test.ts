/**
 * Tests for src/lib/server/financial-inputs.ts
 * Validates money/rate parsing, comma stripping, negative rejection, edge cases.
 */
import { describe, it, expect } from 'vitest';
import {
  parseMoneyInput,
  parseOptionalMoneyInput,
  parsePositiveMoneyInput,
  parseRateInput,
  parseOptionalRateInput,
} from '@/lib/server/financial-inputs';

describe('parseMoneyInput', () => {
  it('parses a simple amount to 2 decimal places', () => {
    expect(parseMoneyInput('1000', 'Amount')).toBe('1000.00');
  });

  it('strips commas before parsing', () => {
    expect(parseMoneyInput('1,000,000.50', 'Amount')).toBe('1000000.50');
  });

  it('trims whitespace', () => {
    expect(parseMoneyInput('  500.25  ', 'Amount')).toBe('500.25');
  });

  it('rounds half-up to 2 decimal places', () => {
    expect(parseMoneyInput('100.555', 'Amount')).toBe('100.56');
  });

  it('accepts zero', () => {
    expect(parseMoneyInput('0', 'Amount')).toBe('0.00');
  });

  it('throws on empty string', () => {
    expect(() => parseMoneyInput('', 'Amount')).toThrow('Amount is required');
  });

  it('throws on null', () => {
    expect(() => parseMoneyInput(null, 'Amount')).toThrow('Amount is required');
  });

  it('throws on negative value', () => {
    expect(() => parseMoneyInput('-100', 'Amount')).toThrow('must be a valid non-negative amount');
  });

  it('throws on non-numeric value', () => {
    expect(() => parseMoneyInput('abc', 'Amount')).toThrow();
  });

  it('preserves large precision amounts', () => {
    expect(parseMoneyInput('999999999.99', 'Amount')).toBe('999999999.99');
  });

  it('converts integer string to .00 format', () => {
    expect(parseMoneyInput('42', 'Amount')).toBe('42.00');
  });
});

describe('parseOptionalMoneyInput', () => {
  it('returns null for empty string', () => {
    expect(parseOptionalMoneyInput('', 'Amount')).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseOptionalMoneyInput(null, 'Amount')).toBeNull();
  });

  it('parses valid amounts normally', () => {
    expect(parseOptionalMoneyInput('500', 'Amount')).toBe('500.00');
  });

  it('still throws on negative amounts', () => {
    expect(() => parseOptionalMoneyInput('-10', 'Amount')).toThrow();
  });
});

describe('parsePositiveMoneyInput', () => {
  it('parses positive amounts', () => {
    expect(parsePositiveMoneyInput('100', 'Amount')).toBe('100.00');
  });

  it('throws on zero', () => {
    expect(() => parsePositiveMoneyInput('0', 'Amount')).toThrow('must be greater than zero');
  });

  it('throws on negative', () => {
    expect(() => parsePositiveMoneyInput('-5', 'Amount')).toThrow();
  });
});

describe('parseRateInput', () => {
  it('converts percentage to decimal (divides by 100)', () => {
    expect(parseRateInput('12', 'Rate')).toBe('0.120000');
  });

  it('handles decimal percentages', () => {
    expect(parseRateInput('2.5', 'Rate')).toBe('0.025000');
  });

  it('strips commas', () => {
    expect(parseRateInput('1,000', 'Rate')).toBe('10.000000');
  });

  it('handles zero rate', () => {
    expect(parseRateInput('0', 'Rate')).toBe('0.000000');
  });

  it('throws on empty value', () => {
    expect(() => parseRateInput('', 'Rate')).toThrow('Rate is required');
  });

  it('throws on negative rate', () => {
    expect(() => parseRateInput('-5', 'Rate')).toThrow('must be a valid non-negative rate');
  });
});

describe('parseOptionalRateInput', () => {
  it('returns null for empty string', () => {
    expect(parseOptionalRateInput('', 'Rate')).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseOptionalRateInput(null, 'Rate')).toBeNull();
  });

  it('parses valid rates normally', () => {
    expect(parseOptionalRateInput('5', 'Rate')).toBe('0.050000');
  });
});
