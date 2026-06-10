import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

async function loadLoginAction() {
  vi.resetModules();
  return await import('./actions');
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('login action', () => {
  it('blocks persistent database access when Supabase Auth is not configured', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost/lej';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.LEJ_ALLOW_DB_SEED_MODE;

    const { login } = await loadLoginAction();
    const result = await login({}, new FormData());

    expect(result.error).toContain('Supabase Auth must be configured');
  });

  it('allows true seed mode to redirect to dashboard', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { login } = await loadLoginAction();

    await expect(login({}, new FormData())).rejects.toThrow('redirect:/dashboard');
  });
});
