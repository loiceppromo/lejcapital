import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadMode() {
  vi.resetModules();
  const mod = await import('../mode');
  return mod.getAuthMode();
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('getAuthMode', () => {
  it('uses seed mode when no database or Supabase config exists', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(loadMode()).resolves.toBe('seed');
  });

  it('uses Supabase mode when Supabase config exists', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost/lej';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    await expect(loadMode()).resolves.toBe('supabase');
  });

  it('blocks persistent database access when Supabase is missing', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost/lej';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.LEJ_ALLOW_DB_SEED_MODE;

    await expect(loadMode()).resolves.toBe('blocked');
  });

  it('allows explicit non-production DB seed mode for local testing', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://localhost/lej';
    process.env.LEJ_ALLOW_DB_SEED_MODE = '1';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(loadMode()).resolves.toBe('seed');
  });
});
