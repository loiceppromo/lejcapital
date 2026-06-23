'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getAuthMode } from '@/lib/auth/mode';
import { getAccountAccess } from '@/lib/auth/roles';
import { rateLimitAction } from '@/lib/rate-limit';

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    if (getAuthMode() === 'blocked') {
      return { error: 'Supabase Auth must be configured before accessing a persistent LEJ database.' };
    }
    redirect('/dashboard');
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    rateLimitAction(email.toLowerCase(), 'login', 5, 60_000);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Too many login attempts. Try again later.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const account = await getAccountAccess(user?.email);
  if (!account?.active) {
    await supabase.auth.signOut();
    return { error: 'This account is not authorized for LEJ Capital Management.' };
  }

  const redirectTo = formData.get('redirect') as string;
  redirect(redirectTo || '/dashboard');
}

export async function logout(): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect('/login');
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
