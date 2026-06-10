import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(async () => ({ error: null })),
      getUser: vi.fn(async () => ({ data: { user: { email: 'loiceppromo@gmail.com' } } })),
      signOut: vi.fn(async () => undefined),
    },
  })),
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

  it('rate limits repeated Supabase login attempts by email', async () => {
    delete process.env.DATABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const { login } = await loadLoginAction();
    const form = new FormData();
    form.set('email', 'loiceppromo@gmail.com');
    form.set('password', 'test-password');

    for (let i = 0; i < 5; i += 1) {
      await expect(login({}, form)).rejects.toThrow('redirect:/dashboard');
    }

    const result = await login({}, form);
    expect(result.error).toContain('Rate limited');
  });
});
