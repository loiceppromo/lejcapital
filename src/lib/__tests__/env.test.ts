import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '../env';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns seed-data mode when no DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    delete process.env.SKIP_ENV_VALIDATION;
    const result = validateEnv();
    expect(result.mode).toBe('seed-data');
    expect(result.valid).toBe(true);
  });

  it('skips validation when SKIP_ENV_VALIDATION=1', () => {
    process.env.SKIP_ENV_VALIDATION = '1';
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports errors for missing required vars in production mode', () => {
    delete process.env.SKIP_ENV_VALIDATION;
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const result = validateEnv();
    expect(result.mode).toBe('production');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('passes with all required vars set', () => {
    delete process.env.SKIP_ENV_VALIDATION;
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.mode).toBe('production');
  });

  it('rejects invalid DATABASE_URL format', () => {
    delete process.env.SKIP_ENV_VALIDATION;
    process.env.DATABASE_URL = 'mysql://localhost/test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('postgres://'))).toBe(true);
  });
});
