import { describe, it, expect } from 'vitest';
import { validateField } from '../app/form-field';

describe('validateField', () => {
  it('returns error for required empty field', () => {
    expect(validateField('', { required: true })).toBe('This field is required');
    expect(validateField('  ', { required: true })).toBe('This field is required');
    expect(validateField(null, { required: true })).toBe('This field is required');
  });

  it('returns custom required message', () => {
    expect(validateField('', { required: 'Name is required' })).toBe('Name is required');
  });

  it('returns null for valid required field', () => {
    expect(validateField('hello', { required: true })).toBeNull();
  });

  it('checks minLength', () => {
    expect(validateField('ab', { minLength: 3 })).toBe('Minimum 3 characters');
    expect(validateField('abc', { minLength: 3 })).toBeNull();
  });

  it('checks maxLength', () => {
    expect(validateField('abcdef', { maxLength: 5 })).toBe('Maximum 5 characters');
    expect(validateField('abcde', { maxLength: 5 })).toBeNull();
  });

  it('checks min value', () => {
    expect(validateField('0', { min: 1 })).toBe('Must be at least 1');
    expect(validateField('1', { min: 1 })).toBeNull();
  });

  it('checks max value', () => {
    expect(validateField('101', { max: 100 })).toBe('Must be at most 100');
    expect(validateField('100', { max: 100 })).toBeNull();
  });

  it('checks pattern', () => {
    expect(validateField('bad', { pattern: { regex: /^\d+$/, message: 'Numbers only' } })).toBe('Numbers only');
    expect(validateField('123', { pattern: { regex: /^\d+$/, message: 'Numbers only' } })).toBeNull();
  });

  it('skips validation on empty non-required fields', () => {
    expect(validateField('', { min: 10 })).toBeNull();
    expect(validateField('', { pattern: { regex: /^\d+$/, message: 'Numbers only' } })).toBeNull();
  });
});
