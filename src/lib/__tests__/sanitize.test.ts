import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeNumber,
  sanitizeMoney,
  sanitizePercent,
  sanitizeDate,
  sanitizeCheckbox,
  sanitizeEnum,
  stripHtml,
  validateRequired,
} from '../sanitize';

describe('sanitizeString', () => {
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });
  it('collapses multiple spaces', () => {
    expect(sanitizeString('hello   world')).toBe('hello world');
  });
  it('returns empty string for null/undefined', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });
});

describe('sanitizeNumber', () => {
  it('parses valid numbers', () => {
    expect(sanitizeNumber('42')).toBe(42);
    expect(sanitizeNumber('3.14')).toBe(3.14);
    expect(sanitizeNumber('-10')).toBe(-10);
  });
  it('returns null for empty/invalid', () => {
    expect(sanitizeNumber('')).toBeNull();
    expect(sanitizeNumber('abc')).toBeNull();
    expect(sanitizeNumber(null)).toBeNull();
  });
  it('rejects Infinity and NaN', () => {
    expect(sanitizeNumber('Infinity')).toBeNull();
    expect(sanitizeNumber('NaN')).toBeNull();
  });
});

describe('sanitizeMoney', () => {
  it('formats to 2 decimal places', () => {
    expect(sanitizeMoney('100')).toBe('100.00');
    expect(sanitizeMoney('99.9')).toBe('99.90');
  });
  it('rejects negative values', () => {
    expect(sanitizeMoney('-50')).toBeNull();
  });
  it('returns null for empty', () => {
    expect(sanitizeMoney('')).toBeNull();
  });
});

describe('sanitizePercent', () => {
  it('accepts 0-100', () => {
    expect(sanitizePercent('0')).toBe('0');
    expect(sanitizePercent('50')).toBe('50');
    expect(sanitizePercent('100')).toBe('100');
  });
  it('rejects out of range', () => {
    expect(sanitizePercent('-1')).toBeNull();
    expect(sanitizePercent('101')).toBeNull();
  });
});

describe('sanitizeDate', () => {
  it('accepts valid YYYY-MM-DD', () => {
    expect(sanitizeDate('2025-06-15')).toBe('2025-06-15');
  });
  it('rejects invalid formats', () => {
    expect(sanitizeDate('15/06/2025')).toBeNull();
    expect(sanitizeDate('2025-13-01')).toBeNull();
    expect(sanitizeDate('')).toBeNull();
  });
});

describe('sanitizeCheckbox', () => {
  it('returns true for on/true/1', () => {
    expect(sanitizeCheckbox('on')).toBe(true);
    expect(sanitizeCheckbox('true')).toBe(true);
    expect(sanitizeCheckbox('1')).toBe(true);
  });
  it('returns false for null/other', () => {
    expect(sanitizeCheckbox(null)).toBe(false);
    expect(sanitizeCheckbox('off')).toBe(false);
  });
});

describe('sanitizeEnum', () => {
  it('accepts valid enum values', () => {
    expect(sanitizeEnum('ACTIVE', ['ACTIVE', 'CLOSED'] as const)).toBe('ACTIVE');
  });
  it('rejects invalid values', () => {
    expect(sanitizeEnum('INVALID', ['ACTIVE', 'CLOSED'] as const)).toBeNull();
    expect(sanitizeEnum('', ['ACTIVE', 'CLOSED'] as const)).toBeNull();
  });
});

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
    expect(stripHtml('<b>bold</b> text')).toBe('bold text');
  });
  it('passes through plain text', () => {
    expect(stripHtml('no tags here')).toBe('no tags here');
  });
});

describe('validateRequired', () => {
  it('returns missing fields', () => {
    const form = new FormData();
    form.set('name', 'Alice');
    form.set('email', '');
    expect(validateRequired(form, ['name', 'email', 'phone'])).toEqual(['email', 'phone']);
  });
  it('returns empty array when all present', () => {
    const form = new FormData();
    form.set('name', 'Alice');
    form.set('email', 'a@b.com');
    expect(validateRequired(form, ['name', 'email'])).toEqual([]);
  });
});
